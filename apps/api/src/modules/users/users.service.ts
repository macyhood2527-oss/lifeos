import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { createHash } from "crypto";

export type UserRow = RowDataPacket & {
  id: number;
  google_id: string | null;
  password_hash?: string | null;
  email: string;
  name: string;
  avatar_url: string | null;
  timezone: string;
  tone: "gentle" | "neutral" | "direct";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  reminders_enabled: number;
  habit_nudges_enabled: number;
  weekly_recap_enabled: number;
  created_at: string;
  updated_at: string;
};

const USER_PUBLIC_COLUMNS = `
  id,
  google_id,
  email,
  name,
  avatar_url,
  timezone,
  tone,
  quiet_hours_start,
  quiet_hours_end,
  reminders_enabled,
  habit_nudges_enabled,
  weekly_recap_enabled,
  created_at,
  updated_at
`;

export async function ensureUserPreferenceColumns() {
  const [rows] = await pool.query<
    (RowDataPacket & { COLUMN_NAME: string })[]
  >(
    `
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('reminders_enabled', 'habit_nudges_enabled', 'weekly_recap_enabled')
    `
  );

  const existing = new Set(rows.map((row) => row.COLUMN_NAME));

  if (!existing.has("reminders_enabled")) {
    await pool.execute(
      `ALTER TABLE users ADD COLUMN reminders_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER quiet_hours_end`
    );
  }
  if (!existing.has("habit_nudges_enabled")) {
    await pool.execute(
      `ALTER TABLE users ADD COLUMN habit_nudges_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER reminders_enabled`
    );
  }
  if (!existing.has("weekly_recap_enabled")) {
    await pool.execute(
      `ALTER TABLE users ADD COLUMN weekly_recap_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER habit_nudges_enabled`
    );
  }
}

export async function findUserById(userId: number) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE id=? LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function findUserByEmail(email: string) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE email=? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function findUserCredentialsByEmail(email: string) {
  const [rows] = await pool.query<
    (RowDataPacket & { id: number; password_hash: string | null })[]
  >(
    `SELECT id, password_hash FROM users WHERE email=? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function createLocalUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}) {
  // Keep google_id compact for schemas with short varchar length.
  const localGoogleId = `l_${createHash("sha256")
    .update(input.email.toLowerCase())
    .digest("hex")
    .slice(0, 16)}`;

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users
      (google_id, email, password_hash, name, avatar_url, timezone, tone, quiet_hours_start, quiet_hours_end, reminders_enabled, habit_nudges_enabled, weekly_recap_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, 'Asia/Manila', 'gentle', NULL, NULL, 1, 1, 1, NOW(3), NOW(3))`,
    [localGoogleId, input.email, input.passwordHash, input.name]
  );

  return (await findUserById(Number(result.insertId)))!;
}

export async function updateUserPasswordById(userId: number, passwordHash: string) {
  await pool.execute(
    `UPDATE users
     SET password_hash=?, updated_at=NOW(3)
     WHERE id=?`,
    [passwordHash, userId]
  );
}

export async function updateUserProfileById(
  userId: number,
  patch: Partial<{
    name: string;
    timezone: string;
    reminders_enabled: boolean;
    habit_nudges_enabled: boolean;
    weekly_recap_enabled: boolean;
  }>
) {
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.name !== undefined) {
    fields.push("name=?");
    values.push(patch.name);
  }
  if (patch.timezone !== undefined) {
    fields.push("timezone=?");
    values.push(patch.timezone);
  }
  if (patch.reminders_enabled !== undefined) {
    fields.push("reminders_enabled=?");
    values.push(patch.reminders_enabled ? 1 : 0);
  }
  if (patch.habit_nudges_enabled !== undefined) {
    fields.push("habit_nudges_enabled=?");
    values.push(patch.habit_nudges_enabled ? 1 : 0);
  }
  if (patch.weekly_recap_enabled !== undefined) {
    fields.push("weekly_recap_enabled=?");
    values.push(patch.weekly_recap_enabled ? 1 : 0);
  }

  if (fields.length === 0) {
    return findUserById(userId);
  }

  values.push(userId);
  await pool.execute(
    `UPDATE users
     SET ${fields.join(", ")}, updated_at=NOW(3)
     WHERE id=?`,
    values
  );

  return findUserById(userId);
}

export async function getUserSettings(userId: number) {
  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number;
      timezone: string;
      tone: "gentle" | "neutral" | "direct";
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
      reminders_enabled: number;
      habit_nudges_enabled: number;
      weekly_recap_enabled: number;
    })[]
  >(
    `SELECT id, timezone, tone, quiet_hours_start, quiet_hours_end, reminders_enabled, habit_nudges_enabled, weekly_recap_enabled
     FROM users
     WHERE id=?
     LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function findOrCreateUserFromGoogle(input: {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}) {
  // 1) Try by google_id
  const [byGoogle] = await pool.query<UserRow[]>(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE google_id=? LIMIT 1`,
    [input.googleId]
  );
  if (byGoogle[0]) return byGoogle[0];

  // 2) Try by email (link account)
  const [byEmail] = await pool.query<UserRow[]>(
    `SELECT ${USER_PUBLIC_COLUMNS} FROM users WHERE email=? LIMIT 1`,
    [input.email]
  );

  if (byEmail[0]) {
    await pool.execute(
      `UPDATE users
       SET google_id=?, name=?, avatar_url=?, updated_at=NOW(3)
       WHERE id=?`,
      [input.googleId, input.name, input.avatarUrl, byEmail[0].id]
    );
    return (await findUserById(byEmail[0].id))!;
  }

  // 3) Create
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users
      (google_id, email, name, avatar_url, timezone, tone, quiet_hours_start, quiet_hours_end, reminders_enabled, habit_nudges_enabled, weekly_recap_enabled, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Asia/Manila', 'gentle', NULL, NULL, 1, 1, 1, NOW(3), NOW(3))`,
    [input.googleId, input.email, input.name, input.avatarUrl]
  );

  return (await findUserById(Number(result.insertId)))!;
}
