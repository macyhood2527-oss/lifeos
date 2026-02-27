import cron from "node-cron";
import { configureWebPush, isWebPushConfigured, getWebPushConfigError, webpush } from "../config/webpush";
import { listDueReminders, markRan, computeNextRunAfterSend } from "../modules/reminders/reminders.service";
import { listSubscriptions, removeSubscriptionById } from "../modules/push/push.service";
import { pool } from "../db/pool";
import type { RowDataPacket } from "mysql2/promise";
import { buildReminderText } from "./messageTemplates";

import { getUserSettings } from "../modules/users/users.service";
import { isInQuietHours } from "../utils/time";

type EntityTitleRow = RowDataPacket & { title?: string; name?: string };

// ---- notification_log helpers ----
async function hasRunKey(runKey: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM notification_log WHERE run_key=? LIMIT 1`,
    [runKey]
  );
  return !!rows[0];
}

async function logNotification(params: {
  userId: number;
  reminderId: number;
  runKey: string;
  status: "sent" | "skipped" | "failed";
  errorMessage?: string | null;
}) {
  await pool.execute(
    `INSERT INTO notification_log (user_id, reminder_id, run_key, sent_at, status, error_message)
     VALUES (?, ?, ?, NOW(3), ?, ?)`,
    [params.userId, params.reminderId, params.runKey, params.status, params.errorMessage ?? null]
  );
}

// ---- entity title lookup (for nicer message copy) ----
async function getEntityTitle(userId: number, entityType: "habit" | "task", entityId: number) {
  if (entityType === "task") {
    const [rows] = await pool.query<EntityTitleRow[]>(
      `SELECT title FROM tasks WHERE user_id=? AND id=? LIMIT 1`,
      [userId, entityId]
    );
    return rows[0]?.title ?? null;
  }

  const [rows] = await pool.query<EntityTitleRow[]>(
    `SELECT name FROM habits WHERE user_id=? AND id=? LIMIT 1`,
    [userId, entityId]
  );
  return rows[0]?.name ?? null;
}

// Normalize run key so it’s stable and dedupes correctly even if Date parsing differs.
// We combine reminderId + stored next_run_at (as string) + minute bucket (UTC).
function buildRunKey(reminderId: number, nextRunAt: any, now: Date) {
  const nextRaw =
    nextRunAt instanceof Date
      ? nextRunAt.toISOString()
      : typeof nextRunAt === "string"
      ? nextRunAt
      : nextRunAt
      ? String(nextRunAt)
      : "none";

  const minuteBucket = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 0, 0)
  ).toISOString();

  return `${reminderId}:${nextRaw}:${minuteBucket}`;
}

export function startReminderScheduler() {
  // Configure push once (safe, won’t crash server if env invalid)
  configureWebPush();
  if (!isWebPushConfigured()) {
    console.warn("[ReminderScheduler] Web Push not configured:", getWebPushConfigError());
  }

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    let due: any[] = [];
    try {
      due = await listDueReminders(now);
    } catch (e: any) {
      console.error("[ReminderScheduler] listDueReminders failed:", e?.message || e);
      return;
    }

    for (const r of due) {
      const runKey = buildRunKey(r.id, r.next_run_at, now);

      try {
        // dedupe
        if (await hasRunKey(runKey)) {
          const next = computeNextRunAfterSend(r);
          await markRan(r.id, now, next);
          continue;
        }

        // ✅ quiet hours (user-based + timezone-aware)
        if (r.respect_quiet_hours === 1) {
          const settings = await getUserSettings(r.user_id);
          const tz = settings?.timezone || "Asia/Manila";

          if (settings?.quiet_hours_start && settings?.quiet_hours_end) {
            const quiet = isInQuietHours({
              now,
              timeZone: tz,
              quietStart: settings.quiet_hours_start,
              quietEnd: settings.quiet_hours_end,
            });

            if (quiet) {
              await logNotification({
                userId: r.user_id,
                reminderId: r.id,
                runKey,
                status: "skipped",
                errorMessage: "quiet_hours",
              });

              const next = computeNextRunAfterSend(r);
              await markRan(r.id, now, next);
              continue;
            }
          }
        }

        // if push not configured, fail gracefully (don’t crash loop)
        if (!isWebPushConfigured()) {
          await logNotification({
            userId: r.user_id,
            reminderId: r.id,
            runKey,
            status: "failed",
            errorMessage: "push_not_configured",
          });

          const next = computeNextRunAfterSend(r);
          await markRan(r.id, now, next);
          continue;
        }

        const subs = await listSubscriptions(r.user_id);

        if (!subs || subs.length === 0) {
          await logNotification({
            userId: r.user_id,
            reminderId: r.id,
            runKey,
            status: "failed",
            errorMessage: "no_subscriptions",
          });

          const next = computeNextRunAfterSend(r);
          await markRan(r.id, now, next);
          continue;
        }

       // build message (user tone-aware)
const settings = await getUserSettings(r.user_id);
const userTone = settings?.tone ?? "gentle";

const title = await getEntityTitle(r.user_id, r.entity_type, r.entity_id);

const body = buildReminderText({
  tone: userTone,
  entityType: r.entity_type,
  title: title ?? undefined,
});

        const payload = JSON.stringify({
          title: "LifeOS",
          body,
          data: { reminderId: r.id, entityType: r.entity_type, entityId: r.entity_id },
        });

        let sentCount = 0;
        let failedCount = 0;
        let lastErr: string | null = null;

        for (const s of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload
            );
            sentCount++;
          } catch (e: any) {
            failedCount++;
            lastErr = e?.message ?? "push_failed";

            const status = e?.statusCode || e?.status;

            // If subscription is gone, remove it so we don’t keep failing forever.
            if (status === 404 || status === 410) {
              if (s.id) {
                await removeSubscriptionById(r.user_id, s.id);
              }
            }
          }
        }

        // Log only once per reminder run (less spammy)
        if (sentCount > 0) {
          await logNotification({
            userId: r.user_id,
            reminderId: r.id,
            runKey,
            status: "sent",
            errorMessage: failedCount > 0 ? `partial_failures:${failedCount}` : null,
          });
        } else {
          await logNotification({
            userId: r.user_id,
            reminderId: r.id,
            runKey,
            status: "failed",
            errorMessage: lastErr ?? "push_failed",
          });
        }

        const next = computeNextRunAfterSend(r);
        await markRan(r.id, now, next);
      } catch (e: any) {
        console.error(`[ReminderScheduler] reminder ${r?.id} run failed:`, e?.message || e);

        // Don’t block future runs: still advance schedule if something unexpected happens
        try {
          await logNotification({
            userId: r.user_id,
            reminderId: r.id,
            runKey,
            status: "failed",
            errorMessage: e?.message ?? "scheduler_error",
          });
          const next = computeNextRunAfterSend(r);
          await markRan(r.id, now, next);
        } catch (inner: any) {
          console.error("[ReminderScheduler] failed to markRan/log after error:", inner?.message || inner);
        }
      }
    }
  });
}