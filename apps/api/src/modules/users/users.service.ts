import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type UserRow = RowDataPacket & {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  timezone: string;
  tone: "gentle" | "neutral" | "direct";
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
};

export async function findUserById(userId: number) {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT * FROM users WHERE id=? LIMIT 1`,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getUserSettings(userId: number) {
  const [rows] = await pool.query<
    (RowDataPacket & {
      id: number;
      timezone: string;
      tone: "gentle" | "neutral" | "direct";
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
    })[]
  >(
    `SELECT id, timezone, tone, quiet_hours_start, quiet_hours_end
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
    `SELECT * FROM users WHERE google_id=? LIMIT 1`,
    [input.googleId]
  );
  if (byGoogle[0]) return byGoogle[0];

  // 2) Try by email (link account)
  const [byEmail] = await pool.query<UserRow[]>(
    `SELECT * FROM users WHERE email=? LIMIT 1`,
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
      (google_id, email, name, avatar_url, timezone, tone, quiet_hours_start, quiet_hours_end, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'Asia/Manila', 'gentle', NULL, NULL, NOW(3), NOW(3))`,
    [input.googleId, input.email, input.name, input.avatarUrl]
  );

  return (await findUserById(Number(result.insertId)))!;
}