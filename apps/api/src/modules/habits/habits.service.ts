import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

type HabitRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  active: number;
  sort_order: number;
  cadence: "daily" | "weekly";
  target_per_period: number;
  created_at: string;
  updated_at: string;
};
type HabitWithProgressRow = HabitRow & {
  progress: number;
  checked_in_today: boolean;
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
};

type CheckinRow = RowDataPacket & {
  id: number;
  user_id: number;
  habit_id: number;
  checkin_date: string; // DATE
  value: number;
  created_at: string;
};

function todayYYYYMMDDInTZ(timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

function parseYYYYMMDD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) throw new Error("Invalid date format");
  return new Date(Date.UTC(y, m - 1, d)); // UTC date-only
}

function toYYYYMMDD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(dateYYYYMMDD: string, delta: number) {
  const d = parseYYYYMMDD(dateYYYYMMDD);
  d.setUTCDate(d.getUTCDate() + delta);
  return toYYYYMMDD(d);
}

// Monday-start: Mon=0..Sun=6
function weekdayIndexMonStartFromUTCDate(dateYYYYMMDD: string) {
  const d = parseYYYYMMDD(dateYYYYMMDD);
  const js = d.getUTCDay(); // 0=Sun..6=Sat
  // convert to Mon-start
  // Sun(0)->6, Mon(1)->0, Tue(2)->1, ... Sat(6)->5
  return js === 0 ? 6 : js - 1;
}

function weekStartMonday(dateYYYYMMDD: string) {
  const idx = weekdayIndexMonStartFromUTCDate(dateYYYYMMDD);
  return addDays(dateYYYYMMDD, -idx);
}

function weekEndSunday(weekStartYYYYMMDD: string) {
  return addDays(weekStartYYYYMMDD, 6);
}

function normalizeYYYYMMDD(v: any) {
  // mysql2 may return DATE as Date object or string depending on config
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10); // works if already "YYYY-MM-DD"
}

export async function createHabit(userId: number, input: any) {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO habits (user_id, name, description, active, sort_order, cadence, target_per_period, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
    [
      userId,
      input.name,
      input.description ?? null,
      input.active === false ? 0 : 1,
      input.sort_order ?? 0,
      input.cadence ?? "daily",
      input.target_per_period ?? 1,
    ]
  );
  return getHabitById(userId, Number(result.insertId));
}

export async function listHabits(userId: number, opts?: { includeInactive?: boolean }) {
  const includeInactive = opts?.includeInactive ?? false;
  const [rows] = await pool.query<HabitRow[]>(
    `SELECT * FROM habits
     WHERE user_id = ?
       AND (${includeInactive ? "1=1" : "active=1"})
     ORDER BY sort_order ASC, created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listHabitsWithProgress(
  userId: number,
  timeZone: string,
  opts?: { includeInactive?: boolean }
): Promise<HabitWithProgressRow[]> {
  // 1) get habits (definitions)
  const habits = await listHabits(userId, opts);

  // if no habits, return fast
  if (!habits.length) return habits as any;

  // 2) compute today's date in user's TZ
  const today = todayYYYYMMDDInTZ(timeZone);

  // 3) compute current Mon–Sun week range (based on TODAY in tz)
  const weekStart = weekStartMonday(today);
  const weekEnd = weekEndSunday(weekStart);

  /**
   * 4) Fetch ALL checkins for THIS WEEK only (Mon–Sun) for this user.
   * We use SUM(value) per habit per date.
   * This supports multiple checkins in a day.
   */
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT habit_id, checkin_date, SUM(value) AS total
    FROM habit_checkins
    WHERE user_id = ?
      AND checkin_date BETWEEN ? AND ?
    GROUP BY habit_id, checkin_date
    `,
    [userId, weekStart, weekEnd]
  );

  // 5) Build maps for quick lookup
  // dailySumByHabit: habitId -> sum(value) for TODAY
  const dailySumByHabit = new Map<number, number>();

  // weeklySumByHabit: habitId -> sum(value) for THIS WEEK
  const weeklySumByHabit = new Map<number, number>();

  for (const r of rows) {
    const hid = Number(r.habit_id);
 const d = normalizeYYYYMMDD(r.checkin_date);
    const total = Number(r.total || 0);

    // weekly sum accumulates all dates in range
    weeklySumByHabit.set(hid, (weeklySumByHabit.get(hid) ?? 0) + total);

    // today sum (exact match)
    if (d === today) {
      dailySumByHabit.set(hid, (dailySumByHabit.get(hid) ?? 0) + total);
    }
  }

  // 6) Attach computed fields to each habit row
  const out: HabitWithProgressRow[] = habits.map((h) => {
    const hid = Number(h.id);

    const todaySum = dailySumByHabit.get(hid) ?? 0;
    const weekSum = weeklySumByHabit.get(hid) ?? 0;

    const isWeekly = h.cadence === "weekly";

    const progress = isWeekly ? weekSum : todaySum;

    return {
      ...h,
      progress,
      checked_in_today: todaySum > 0,
      period_start: isWeekly ? weekStart : today,
      period_end: isWeekly ? weekEnd : today,
    };
  });

  return out;
}

export async function getHabitById(userId: number, habitId: number) {
  const [rows] = await pool.query<HabitRow[]>(
    `SELECT * FROM habits WHERE user_id=? AND id=? LIMIT 1`,
    [userId, habitId]
  );
  return rows[0] ?? null;
}

export async function updateHabit(userId: number, habitId: number, patch: any) {
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.name !== undefined) { fields.push("name=?"); values.push(patch.name); }
  if (patch.description !== undefined) { fields.push("description=?"); values.push(patch.description); }
  if (patch.active !== undefined) { fields.push("active=?"); values.push(patch.active ? 1 : 0); }
  if (patch.sort_order !== undefined) { fields.push("sort_order=?"); values.push(patch.sort_order); }
  if (patch.cadence !== undefined) { fields.push("cadence=?"); values.push(patch.cadence); }
  if (patch.target_per_period !== undefined) { fields.push("target_per_period=?"); values.push(patch.target_per_period); }

  if (fields.length === 0) return getHabitById(userId, habitId);

  values.push(userId, habitId);

  await pool.execute(
    `UPDATE habits SET ${fields.join(", ")}, updated_at=NOW(3)
     WHERE user_id=? AND id=?`,
    values
  );

  return getHabitById(userId, habitId);
}

export async function deleteHabit(userId: number, habitId: number) {
  // MVP: soft disable instead of delete
  await pool.execute(
    `UPDATE habits SET active=0, updated_at=NOW(3) WHERE user_id=? AND id=?`,
    [userId, habitId]
  );
  return true;
}

export async function checkinHabit(userId: number, habitId: number, input: any) {
  const checkin_date = input.checkin_date;
  const value = Number(input.value ?? 1);

  const habit = await getHabitById(userId, habitId);
  if (!habit) return null;

  // UPSERT: create row if none, otherwise increment value
  await pool.execute<ResultSetHeader>(
    `
    INSERT INTO habit_checkins (user_id, habit_id, checkin_date, value, created_at)
    VALUES (?, ?, ?, ?, NOW(3))
    ON DUPLICATE KEY UPDATE
      value = value + VALUES(value)
    `,
    [userId, habitId, checkin_date, value]
  );

  // fetch updated row
  const [rows] = await pool.query<CheckinRow[]>(
    `
    SELECT *
    FROM habit_checkins
    WHERE user_id=? AND habit_id=? AND checkin_date=?
    LIMIT 1
    `,
    [userId, habitId, checkin_date]
  );

  return rows[0] ?? null;
}

export async function undoLatestCheckin(
  userId: number,
  habitId: number,
  checkin_date?: string
) {
  if (!checkin_date) return false;

  const [rows] = await pool.query<CheckinRow[]>(
    `
    SELECT *
    FROM habit_checkins
    WHERE user_id=? AND habit_id=? AND checkin_date=?
    LIMIT 1
    `,
    [userId, habitId, checkin_date]
  );

  const row = rows[0];
  if (!row) return false;

  const currentValue = Number(row.value || 0);

  if (currentValue > 1) {
    await pool.execute(
      `
      UPDATE habit_checkins
      SET value = value - 1
      WHERE user_id=? AND habit_id=? AND checkin_date=?
      `,
      [userId, habitId, checkin_date]
    );
  } else {
    await pool.execute(
      `
      DELETE FROM habit_checkins
      WHERE user_id=? AND habit_id=? AND checkin_date=?
      `,
      [userId, habitId, checkin_date]
    );
  }

  return true;
}

/**
 * ✅ Streak V2
 * - daily: consecutive days where value >= target_per_period
 * - weekly: consecutive Mon–Sun weeks where sum(value) >= target_per_period
 *
 * Returns richer payload for frontend.
 */
export async function getHabitStreak(userId: number, habitId: number, timeZone: string) {
  const habit = await getHabitById(userId, habitId);
  if (!habit) return null;

  const target = Math.max(1, Number(habit.target_per_period || 1));

  if (habit.cadence === "daily") {
    // Pull last ~180 days checkins
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT checkin_date, value
       FROM habit_checkins
       WHERE user_id=? AND habit_id=?
       ORDER BY checkin_date DESC
       LIMIT 400`,
      [userId, habitId]
    );

    const byDate = new Map<string, number>();
    for (const r of rows) {
 const d = normalizeYYYYMMDD(r.checkin_date);
byDate.set(d, (byDate.get(d) ?? 0) + Number(r.value || 0)); // USE SUM alignment
    }

    const today = todayYYYYMMDDInTZ(timeZone);

    const todayDone = (byDate.get(today) ?? 0) >= target;

    // gentle rule: if today not done, start from yesterday
    let cursor = todayDone ? today : addDays(today, -1);

    let streak = 0;
    while (true) {
      const v = byDate.get(cursor) ?? 0;
      if (v < target) break;
      streak++;
      cursor = addDays(cursor, -1);
      // hard cap to prevent infinite loops
      if (streak > 3660) break;
    }

    return {
      habit_id: habitId,
      cadence: "daily" as const,
      target_per_period: target,
      currentStreak: streak,
      thisPeriod: { start: today, end: today },
      thisPeriodProgress: {
        value: byDate.get(today) ?? 0,
        target,
      },
      isOnTrackThisPeriod: todayDone,
    };
  }

  // -------- weekly cadence --------
  // We'll bucket checkins by weekStart (Mon)
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT checkin_date, value
     FROM habit_checkins
     WHERE user_id=? AND habit_id=?
     ORDER BY checkin_date DESC
     LIMIT 1200`,
    [userId, habitId]
  );

  const weeklySum = new Map<string, number>(); // weekStart -> sum(value)
  for (const r of rows) {
const date = normalizeYYYYMMDD(r.checkin_date);
    const ws = weekStartMonday(date);
    weeklySum.set(ws, (weeklySum.get(ws) ?? 0) + Number(r.value || 0));
  }

  const today = todayYYYYMMDDInTZ(timeZone);
  const thisWeekStart = weekStartMonday(today);
  const thisWeekEnd = weekEndSunday(thisWeekStart);

  const thisWeekProgress = weeklySum.get(thisWeekStart) ?? 0;
  const thisWeekDone = thisWeekProgress >= target;

  // streak: count consecutive completed weeks
  // gentle rule: if this week not done yet, start from last week
  let cursorWeekStart = thisWeekDone ? thisWeekStart : addDays(thisWeekStart, -7);

  let streak = 0;
  while (true) {
    const sum = weeklySum.get(cursorWeekStart) ?? 0;
    if (sum < target) break;
    streak++;
    cursorWeekStart = addDays(cursorWeekStart, -7);
    if (streak > 520) break; // 10 years cap
  }

  return {
    habit_id: habitId,
    cadence: "weekly" as const,
    target_per_period: target,
    currentStreak: streak,
    thisPeriod: { start: thisWeekStart, end: thisWeekEnd },
    thisPeriodProgress: {
      value: thisWeekProgress,
      target,
    },
    isOnTrackThisPeriod: thisWeekDone,
  };
}