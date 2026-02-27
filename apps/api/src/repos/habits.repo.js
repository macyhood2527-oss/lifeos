import pool from "../db/pool.js";

/**
 * NOTE about days_of_week storage:
 * - If your `habits.days_of_week` is MySQL SET('mon',...): you can store as comma string "mon,wed"
 * - If it's JSON: store JSON array
 *
 * This repo assumes MySQL SET for days_of_week (common with your reminders table).
 */

function toSetValue(days) {
  if (!days || days.length === 0) return null;
  // MySQL SET stored as comma-separated string
  return days.join(",");
}

function fromSetValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function listHabits(userId) {
  const [rows] = await pool.query(
    `
    SELECT id, user_id, name, description, schedule_type, days_of_week, is_active, created_at, updated_at
    FROM habits
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows.map((r) => ({
    ...r,
    days_of_week: fromSetValue(r.days_of_week),
  }));
}

export async function getHabitById(userId, habitId) {
  const [rows] = await pool.query(
    `
    SELECT id, user_id, name, description, schedule_type, days_of_week, is_active, created_at, updated_at
    FROM habits
    WHERE user_id = ? AND id = ?
    LIMIT 1
    `,
    [userId, habitId]
  );

  const r = rows[0];
  if (!r) return null;
  return { ...r, days_of_week: fromSetValue(r.days_of_week) };
}

export async function createHabit(userId, data) {
  const [res] = await pool.query(
    `
    INSERT INTO habits (user_id, name, description, schedule_type, days_of_week, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      data.name,
      data.description ?? null,
      data.schedule_type ?? "daily",
      toSetValue(data.days_of_week),
      data.is_active ?? true,
    ]
  );

  return getHabitById(userId, res.insertId);
}

export async function updateHabit(userId, habitId, patch) {
  // Build dynamic update safely
  const fields = [];
  const params = [];

  const map = {
    name: patch.name,
    description: patch.description,
    schedule_type: patch.schedule_type,
    days_of_week: patch.days_of_week ? toSetValue(patch.days_of_week) : undefined,
    is_active: patch.is_active,
  };

  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    params.push(v);
  }

  if (fields.length === 0) {
    return getHabitById(userId, habitId);
  }

  params.push(userId, habitId);

  await pool.query(
    `
    UPDATE habits
    SET ${fields.join(", ")}, updated_at = NOW()
    WHERE user_id = ? AND id = ?
    `,
    params
  );

  return getHabitById(userId, habitId);
}

export async function deleteHabit(userId, habitId) {
  const [res] = await pool.query(
    `DELETE FROM habits WHERE user_id = ? AND id = ?`,
    [userId, habitId]
  );
  return res.affectedRows > 0;
}

/** Check-ins */

export async function hasCheckin(habitId, dateStr) {
  const [rows] = await pool.query(
    `
    SELECT id
    FROM habit_checkins
    WHERE habit_id = ? AND checkin_date = ?
    LIMIT 1
    `,
    [habitId, dateStr]
  );
  return !!rows[0];
}

export async function createCheckin(habitId, dateStr) {
  // Unique constraint ensures idempotency
  await pool.query(
    `
    INSERT INTO habit_checkins (habit_id, checkin_date)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE checkin_date = VALUES(checkin_date)
    `,
    [habitId, dateStr]
  );
}

export async function deleteCheckin(habitId, dateStr) {
  const [res] = await pool.query(
    `DELETE FROM habit_checkins WHERE habit_id = ? AND checkin_date = ?`,
    [habitId, dateStr]
  );
  return res.affectedRows > 0;
}

export async function listCheckinsInRange(habitId, startDate, endDate) {
  const [rows] = await pool.query(
    `
    SELECT checkin_date
    FROM habit_checkins
    WHERE habit_id = ?
      AND checkin_date >= ?
      AND checkin_date <= ?
    ORDER BY checkin_date DESC
    `,
    [habitId, startDate, endDate]
  );
  return rows.map((r) => r.checkin_date); // "YYYY-MM-DD"
}