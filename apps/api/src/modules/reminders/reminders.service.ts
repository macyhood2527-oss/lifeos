import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { configureWebPush, getWebPushConfigError, isWebPushConfigured, webpush } from "../../config/webpush";
import { listSubscriptions, removeSubscriptionById } from "../push/push.service";
import { buildReminderText } from "../../scheduler/messageTemplates";

export type ReminderRow = RowDataPacket & {
  id: number;
  user_id: number;

  entity_type: "habit" | "task";
  entity_id: number;

  enabled: number;

  schedule_type: "daily" | "weekly" | "cron";
  due_at: string | null;        // datetime or null
  time_of_day: string | null;   // "HH:MM" or "HH:MM:SS" or null
  days_of_week: string | null;  // MySQL SET string e.g. "mon,wed,fri"
  cron_expr: string | null;

  respect_quiet_hours: number;  // 0/1
  last_run_at: string | null;
  next_run_at: string | null;

  created_at: string;
  updated_at: string;
};

// MySQL SET order in your column definition:
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type DayToken = (typeof DAY_ORDER)[number];

function normalizeDaysSet(days: DayToken[] | null | undefined): DayToken[] | null {
  if (!days || days.length === 0) return null;
  const set = new Set(days);
  return DAY_ORDER.filter((d) => set.has(d));
}

// MySQL returns SET as "mon,tue,wed" string or "" (empty) or NULL
function parseDaysSetString(dbValue: string | null): Set<DayToken> | null {
  if (!dbValue) return null; // null/empty => treat as "every day"
  const parts = dbValue
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as DayToken[];

  if (parts.length === 0) return null;
  return new Set(parts);
}

function daysSetToDbString(days: DayToken[] | null | undefined): string | null {
  const normalized = normalizeDaysSet(days);
  if (!normalized) return null;
  return normalized.join(",");
}

function computeNextFromTimeAndDays(timeHHMM: string, daysOfWeekDb: string | null) {
  const now = new Date();
  const [hh, mm] = timeHHMM.slice(0, 5).split(":").map(Number);

  const allowed = parseDaysSetString(daysOfWeekDb); // null => every day

  const isAllowed = (d: Date) => {
    if (!allowed) return true;

    // JS: 0=Sun..6=Sat; MySQL tokens: mon..sun
    const jsDay = d.getDay();
    const token: DayToken =
      jsDay === 0 ? "sun" :
      jsDay === 1 ? "mon" :
      jsDay === 2 ? "tue" :
      jsDay === 3 ? "wed" :
      jsDay === 4 ? "thu" :
      jsDay === 5 ? "fri" : "sat";

    return allowed.has(token);
  };

  // candidate today at HH:MM
  const cand = new Date(now);
  cand.setHours(hh, mm, 0, 0);

  if (isAllowed(cand) && cand.getTime() > now.getTime()) return cand;

  // find next allowed day within 14 days
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(hh, mm, 0, 0);
    if (isAllowed(d)) return d;
  }

  // fallback: tomorrow same time
  const fb = new Date(now);
  fb.setDate(fb.getDate() + 1);
  fb.setHours(hh, mm, 0, 0);
  return fb;
}

export async function createReminder(
  userId: number,
  input: {
    entity_type: "habit" | "task";
    entity_id: number;

    schedule_type?: "daily" | "weekly" | "cron";
    due_at?: string | null;
    time_of_day?: string | null;
    days_of_week?: DayToken[] | null;
    cron_expr?: string | null;

    enabled?: boolean;
    respect_quiet_hours?: boolean;
  }
) {
  const schedule_type: "daily" | "weekly" | "cron" =
    input.schedule_type ??
    (input.cron_expr ? "cron" : input.days_of_week && input.days_of_week.length ? "weekly" : "daily");

  const daysDb = daysSetToDbString(input.days_of_week);

  let nextRun: Date | null = null;

  if (schedule_type === "cron") {
    // MVP: we "activate" it and let the minute scheduler handle it (cron parser later)
    nextRun = new Date(Date.now() + 60_000);
  } else if (input.due_at) {
    // one-off
    nextRun = new Date(input.due_at);
  } else if (input.time_of_day) {
    // daily/weekly
    nextRun = computeNextFromTimeAndDays(input.time_of_day, daysDb);
  } else {
    throw new Error("time_of_day is required for daily/weekly reminders (unless due_at is provided).");
  }

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO reminders
      (user_id, entity_type, entity_id, enabled, schedule_type, due_at, time_of_day, days_of_week, cron_expr,
       respect_quiet_hours, last_run_at, next_run_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(3), NOW(3))`,
    [
      userId,
      input.entity_type,
      input.entity_id,
      input.enabled === false ? 0 : 1,
      schedule_type,
      input.due_at ?? null,
      input.time_of_day ?? null,
      daysDb,
      input.cron_expr ?? null,
      input.respect_quiet_hours === false ? 0 : 1,
      nextRun
    ]
  );

  return getReminderById(userId, Number(result.insertId));
}

export async function listReminders(userId: number) {
  const [rows] = await pool.query<ReminderRow[]>(
    `SELECT * FROM reminders WHERE user_id=? ORDER BY enabled DESC, next_run_at ASC`,
    [userId]
  );
  return rows;
}

export async function getReminderById(userId: number, id: number) {
  const [rows] = await pool.query<ReminderRow[]>(
    `SELECT * FROM reminders WHERE user_id=? AND id=? LIMIT 1`,
    [userId, id]
  );
  return rows[0] ?? null;
}

export async function updateReminder(
  userId: number,
  id: number,
  patch: Partial<{
    entity_type: "habit" | "task";
    entity_id: number;

    enabled: boolean;
    schedule_type: "daily" | "weekly" | "cron";
    due_at: string | null;
    time_of_day: string | null;
    days_of_week: DayToken[] | null;
    cron_expr: string | null;

    respect_quiet_hours: boolean;
  }>
) {
  const current = await getReminderById(userId, id);
  if (!current) return null;

  const fields: string[] = [];
  const values: any[] = [];
  const set = (col: string, val: any) => { fields.push(`${col}=?`); values.push(val); };

  if (patch.entity_type !== undefined) set("entity_type", patch.entity_type);
  if (patch.entity_id !== undefined) set("entity_id", patch.entity_id);

  if (patch.enabled !== undefined) set("enabled", patch.enabled ? 1 : 0);
  if (patch.schedule_type !== undefined) set("schedule_type", patch.schedule_type);

  if (patch.due_at !== undefined) set("due_at", patch.due_at);
  if (patch.time_of_day !== undefined) set("time_of_day", patch.time_of_day);
  if (patch.days_of_week !== undefined) set("days_of_week", daysSetToDbString(patch.days_of_week));
  if (patch.cron_expr !== undefined) set("cron_expr", patch.cron_expr);

  if (patch.respect_quiet_hours !== undefined) set("respect_quiet_hours", patch.respect_quiet_hours ? 1 : 0);

  // recompute next_run_at if schedule-related fields changed
  const schedule_type = patch.schedule_type ?? current.schedule_type;
  const time_of_day = patch.time_of_day ?? current.time_of_day;
  const daysDb = patch.days_of_week !== undefined ? daysSetToDbString(patch.days_of_week) : current.days_of_week;
  const due_at = patch.due_at ?? current.due_at;
  const cron_expr = patch.cron_expr ?? current.cron_expr;

  let nextRun: Date | null = null;

  if (schedule_type === "cron") {
    // activate and let scheduler handle it (cron parsing later)
    if (cron_expr) nextRun = new Date(Date.now() + 60_000);
  } else if (due_at) {
    nextRun = new Date(due_at);
  } else if (time_of_day) {
    nextRun = computeNextFromTimeAndDays(time_of_day.slice(0, 5), daysDb);
  }

  if (nextRun) set("next_run_at", nextRun);

  if (fields.length === 0) return current;

  values.push(userId, id);

  await pool.execute(
    `UPDATE reminders SET ${fields.join(", ")}, updated_at=NOW(3) WHERE user_id=? AND id=?`,
    values
  );

  return getReminderById(userId, id);
}

export async function deleteReminder(userId: number, id: number) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM reminders WHERE user_id=? AND id=?`,
    [userId, id]
  );
  return result.affectedRows > 0;
}

// scheduler usage
export async function listDueReminders(now: Date) {
  const [rows] = await pool.query<ReminderRow[]>(
    `SELECT * FROM reminders
     WHERE enabled=1 AND next_run_at IS NOT NULL AND next_run_at <= ?
     ORDER BY next_run_at ASC
     LIMIT 200`,
    [now]
  );
  return rows;
}

export async function markRan(reminderId: number, ranAt: Date, nextRunAt: Date | null) {
  await pool.execute(
    `UPDATE reminders SET last_run_at=?, next_run_at=?, updated_at=NOW(3) WHERE id=?`,
    [ranAt, nextRunAt, reminderId]
  );
}

export function computeNextRunAfterSend(r: ReminderRow) {
  if (r.schedule_type === "cron") {
    // placeholder until cron parsing: every minute
    return new Date(Date.now() + 60_000);
  }
  if (r.due_at) return null; // one-shot reminder
  if (!r.time_of_day) return new Date(Date.now() + 60_000);
  return computeNextFromTimeAndDays(r.time_of_day.slice(0, 5), r.days_of_week);
}

type EntityTitleRow = RowDataPacket & { title?: string; name?: string };

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

function buildRunKeyManual(reminderId: number) {
  // Unique enough for manual sends (doesn’t conflict with scheduler runKey)
  return `manual:${reminderId}:${new Date().toISOString()}`;
}

export async function sendReminderNow(userId: number, reminderId: number) {
  const r = await getReminderById(userId, reminderId);
  if (!r) return null;

  // Ensure push configured
  configureWebPush();
  if (!isWebPushConfigured()) {
    const details = getWebPushConfigError() || "push_not_configured";
    const runKey = buildRunKeyManual(reminderId);
    await logNotification({ userId, reminderId, runKey, status: "failed", errorMessage: details });
    return { status: "failed", reason: details };
  }

  const subs = await listSubscriptions(userId);
  if (!subs || subs.length === 0) {
    const runKey = buildRunKeyManual(reminderId);
    await logNotification({ userId, reminderId, runKey, status: "failed", errorMessage: "no_subscriptions" });
    return { status: "failed", reason: "no_subscriptions" };
  }

  const title = await getEntityTitle(userId, r.entity_type, r.entity_id);
  const body = buildReminderText({
    tone: "gentle",
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

      // cleanup dead subs
      if ((status === 404 || status === 410) && s.id) {
        await removeSubscriptionById(userId, s.id);
      }
    }
  }

  const runKey = buildRunKeyManual(reminderId);

  if (sentCount > 0) {
    await logNotification({
      userId,
      reminderId,
      runKey,
      status: "sent",
      errorMessage: failedCount > 0 ? `partial_failures:${failedCount}` : null,
    });
    return { status: "sent", sentCount, failedCount };
  }

  await logNotification({
    userId,
    reminderId,
    runKey,
    status: "failed",
    errorMessage: lastErr ?? "push_failed",
  });

  return { status: "failed", reason: lastErr ?? "push_failed", sentCount, failedCount };
}