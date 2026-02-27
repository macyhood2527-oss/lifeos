import { pool } from "../../db/pool";
import type { RowDataPacket } from "mysql2/promise";
import { getUserSettings } from "../users/users.service";

type StatusCountsRow = RowDataPacket & { status: "sent" | "failed" | "skipped"; count: number };
type CountRow = RowDataPacket & { count: number };

type HabitWeeklyRow = RowDataPacket & {
  habit_id: number;
  name: string;
  cadence: "daily" | "weekly";
  target_per_period: number;
  checkins: number;
};

function parseYYYYMMDD(s: string) {
  // basic parse, assumes "YYYY-MM-DD"
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date format. Use YYYY-MM-DD");
  return { y, m, d };
}

function toISODateFromUTCDate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// Get weekday in user's timezone, and date parts in that timezone.
// Then we do date math using a UTC "date-only" Date (safe for YYYY-MM-DD arithmetic).
function getTzDateParts(now: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });

  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekday = (parts.find((p) => p.type === "weekday")?.value || "").toLowerCase(); // mon,tue,...

  if (!year || !month || !day || !weekday) throw new Error("Failed to resolve date parts in timezone.");

  return { year, month, day, weekday };
}

// Monday-start week. Convert weekday string -> index where Mon=0 ... Sun=6
function weekdayIndexMonStart(weekday: string) {
  switch (weekday) {
    case "mon": return 0;
    case "tue": return 1;
    case "wed": return 2;
    case "thu": return 3;
    case "fri": return 4;
    case "sat": return 5;
    case "sun": return 6;
    default: return 0;
  }
}

function getWeekRangeInTZ(now: Date, timeZone: string, weekStartOverride?: string) {
  if (weekStartOverride) {
    // treat override as week start in YYYY-MM-DD
    const { y, m, d } = parseYYYYMMDD(weekStartOverride);
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);

    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    return {
      start: toISODateFromUTCDate(start),
      end: toISODateFromUTCDate(end),
      endExclusive: toISODateFromUTCDate(endExclusive),
    };
  }

  const { year, month, day, weekday } = getTzDateParts(now, timeZone);

  // Represent "today in TZ" as a UTC date-only object
  const todayUTC = new Date(Date.UTC(year, month - 1, day));
  const idx = weekdayIndexMonStart(weekday);

  const start = new Date(todayUTC);
  start.setUTCDate(start.getUTCDate() - idx);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  return {
    start: toISODateFromUTCDate(start),
    end: toISODateFromUTCDate(end),
    endExclusive: toISODateFromUTCDate(endExclusive),
  };
}

function dtStart(dateYYYYMMDD: string) {
  return `${dateYYYYMMDD} 00:00:00.000`;
}

export async function getWeeklyAnalytics(userId: number, opts?: { weekStart?: string }) {
  const settings = await getUserSettings(userId);
  const tz = settings?.timezone || "Asia/Manila";

  const range = getWeekRangeInTZ(new Date(), tz, opts?.weekStart);

  const startDate = range.start;              // YYYY-MM-DD
  const endDate = range.end;                  // YYYY-MM-DD
  const endExclusiveDate = range.endExclusive; // YYYY-MM-DD (day after end)

  const startDT = dtStart(startDate);
  const endExclusiveDT = dtStart(endExclusiveDate);

  // ---------- TASKS ----------
  const [[createdRow]] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) as count
     FROM tasks
     WHERE user_id=?
       AND created_at >= ?
       AND created_at < ?`,
    [userId, startDT, endExclusiveDT]
  );

  const [[completedRow]] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) as count
     FROM tasks
     WHERE user_id=?
       AND completed_at IS NOT NULL
       AND completed_at >= ?
       AND completed_at < ?`,
    [userId, startDT, endExclusiveDT]
  );

  // overdue "as of end of week": due_date <= endDate and not done
  const [[overdueRow]] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) as count
     FROM tasks
     WHERE user_id=?
       AND status <> 'done'
       AND due_date IS NOT NULL
       AND due_date <= ?`,
    [userId, endDate]
  );

  const tasks = {
    created: Number(createdRow?.count ?? 0),
    completed: Number(completedRow?.count ?? 0),
    overdueEndOfWeek: Number(overdueRow?.count ?? 0),
  };

  // ---------- HABITS ----------
  const [habitRows] = await pool.query<HabitWeeklyRow[]>(
    `
    SELECT
      h.id as habit_id,
      h.name,
      h.cadence,
      h.target_per_period,
      COALESCE(SUM(c.value), 0) as checkins
    FROM habits h
    LEFT JOIN habit_checkins c
      ON c.habit_id = h.id
     AND c.user_id = h.user_id
     AND c.checkin_date >= ?
     AND c.checkin_date <= ?
    WHERE h.user_id = ?
      AND h.active = 1
    GROUP BY h.id, h.name, h.cadence, h.target_per_period
    ORDER BY h.sort_order ASC, h.created_at DESC
    `,
    [startDate, endDate, userId]
  );

  const habits = habitRows.map((h) => {
    const weeklyTarget =
      h.cadence === "weekly"
        ? Number(h.target_per_period || 1)
        : Number(h.target_per_period || 1) * 7;

    const checkins = Number(h.checkins || 0);

    return {
      habit_id: Number(h.habit_id),
      name: h.name,
      cadence: h.cadence,
      checkins,
      weeklyTarget,
      hitTarget: checkins >= weeklyTarget,
    };
  });

  // ---------- REFLECTIONS ----------
  const [[refCountRow]] = await pool.query<CountRow[]>(
    `SELECT COUNT(*) as count
     FROM reflections
     WHERE user_id=?
       AND reflect_date >= ?
       AND reflect_date <= ?`,
    [userId, startDate, endDate]
  );

  const [[avgMoodRow]] = await pool.query<(RowDataPacket & { avgMood: number | null })[]>(
    `SELECT AVG(mood) as avgMood
     FROM reflections
     WHERE user_id=?
       AND reflect_date >= ?
       AND reflect_date <= ?
       AND mood IS NOT NULL`,
    [userId, startDate, endDate]
  );

  const reflections = {
    count: Number(refCountRow?.count ?? 0),
    avgMood: avgMoodRow?.avgMood === null || avgMoodRow?.avgMood === undefined ? null : Number(avgMoodRow.avgMood),
  };

  // ---------- PUSH / NOTIFICATIONS ----------
  const [statusRows] = await pool.query<StatusCountsRow[]>(
    `SELECT status, COUNT(*) as count
     FROM notification_log
     WHERE user_id=?
       AND sent_at >= ?
       AND sent_at < ?
     GROUP BY status`,
    [userId, startDT, endExclusiveDT]
  );

  const push = { sent: 0, failed: 0, skipped: 0 };
  for (const r of statusRows) {
    push[r.status] = Number(r.count || 0);
  }

  // ---------- Gentle recap (simple MVP) ----------
  const totalHabitTargets = habits.length;
  const hitHabits = habits.filter((h) => h.hitTarget).length;

  const gentleRecap =
    tasks.completed > 0 || hitHabits > 0
      ? `You moved with intention this week 🌿 ${tasks.completed} task${tasks.completed === 1 ? "" : "s"} completed, and ${hitHabits}/${totalHabitTargets} habit${totalHabitTargets === 1 ? "" : "s"} met the weekly goal.`
      : `A slower week is still a valid week 🌿 If you want, we can keep it gentle: pick one small task and one tiny habit to carry forward.`;

  return {
    week: { start: startDate, end: endDate, timeZone: tz },
    tasks,
    habits,
    reflections,
    push,
    gentleRecap,
  };
}

