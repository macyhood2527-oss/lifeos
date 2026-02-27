import { pool } from "../../db/pool";
import type { RowDataPacket } from "mysql2/promise";

type TaskRow = RowDataPacket & {
  id: number;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: number | null;
};

type HabitRow = RowDataPacket & {
  id: number;
  name: string;
  cadence: "daily" | "weekly";
  target_per_period: number;
  active: number;
};

type CheckinRow = RowDataPacket & {
  habit_id: number;
  count: number;
};

type ReflectionRow = RowDataPacket & {
  id: number;
  reflect_date: string;
  mood: number | null;
  notes: string | null;
};

export async function getTodayPayload(userId: number, today: string) {
  // Tasks: overdue, due today, active (todo/doing/backlog)
  const [overdue] = await pool.query<TaskRow[]>(
    `SELECT id, title, status, priority, due_date, project_id
     FROM tasks
     WHERE user_id=? AND status <> 'done'
       AND due_date IS NOT NULL
       AND due_date < ?
     ORDER BY due_date ASC, priority DESC, created_at DESC`,
    [userId, today]
  );

  const [dueToday] = await pool.query<TaskRow[]>(
    `SELECT id, title, status, priority, due_date, project_id
     FROM tasks
     WHERE user_id=? AND status <> 'done'
       AND due_date = ?
     ORDER BY priority DESC, created_at DESC`,
    [userId, today]
  );

  const [active] = await pool.query<TaskRow[]>(
    `SELECT id, title, status, priority, due_date, project_id
     FROM tasks
     WHERE user_id=? AND status IN ('backlog','todo','doing')
     ORDER BY status ASC, sort_order ASC, created_at DESC`,
    [userId]
  );

  // Habits (active only)
  const [habits] = await pool.query<HabitRow[]>(
    `SELECT id, name, cadence, target_per_period, active
     FROM habits
     WHERE user_id=? AND active=1
     ORDER BY sort_order ASC, created_at DESC`,
    [userId]
  );

  // Today's habit checkins (counts per habit)
  const [checkins] = await pool.query<CheckinRow[]>(
    `SELECT habit_id, COUNT(*) as count
     FROM habit_checkins
     WHERE user_id=? AND checkin_date=?
     GROUP BY habit_id`,
    [userId, today]
  );

  const checkinMap = new Map<number, number>();
  for (const row of checkins) checkinMap.set(Number(row.habit_id), Number(row.count));

  const habitsWithToday = habits.map((h) => {
    const count = checkinMap.get(h.id) ?? 0;
    const target = h.target_per_period ?? 1;
    return {
      id: h.id,
      name: h.name,
      cadence: h.cadence,
      target_per_period: target,
      today_count: count,
      today_done: count >= target
    };
  });

  // Reflection for today (0 or 1 row)
  const [refRows] = await pool.query<ReflectionRow[]>(
    `SELECT id, reflect_date, mood, notes
     FROM reflections
     WHERE user_id=? AND reflect_date=? LIMIT 1`,
    [userId, today]
  );

  const reflection = refRows[0] ?? null;

  return {
    date: today,
    tasks: {
      overdue,
      dueToday,
      active
    },
    habits: habitsWithToday,
    reflection,
    nudge: "Small steps count."
  };
}