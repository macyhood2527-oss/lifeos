import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";

export type ReflectionRow = RowDataPacket & {
  id: number;
  user_id: number;
  reflect_date: string; // YYYY-MM-DD
  mood: number | null;
  gratitude: string | null;
  highlights: string | null;
  challenges: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export async function getReflectionByDate(userId: number, date: string) {
  const [rows] = await pool.query<ReflectionRow[]>(
    `SELECT * FROM reflections
     WHERE user_id=? AND reflect_date=?
     LIMIT 1`,
    [userId, date]
  );

  return rows[0] ?? null;
}

export async function upsertReflection(
  userId: number,
  date: string,
  input: Partial<{
    mood: number | null;
    gratitude: string | null;
    highlights: string | null;
    challenges: string | null;
    notes: string | null;
  }>
) {
  const values = [
    userId,
    date,
    input.mood ?? null,
    input.gratitude ?? null,
    input.highlights ?? null,
    input.challenges ?? null,
    input.notes ?? null,
  ];

  if (env.DB_PROVIDER === "postgres") {
    await pool.execute(
      `
      INSERT INTO reflections
        (user_id, reflect_date, mood, gratitude, highlights, challenges, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))
      ON CONFLICT (user_id, reflect_date) DO UPDATE SET
        mood=EXCLUDED.mood,
        gratitude=EXCLUDED.gratitude,
        highlights=EXCLUDED.highlights,
        challenges=EXCLUDED.challenges,
        notes=EXCLUDED.notes,
        updated_at=NOW(3)
      `,
      values
    );
  } else {
    await pool.execute(
      `
      INSERT INTO reflections
        (user_id, reflect_date, mood, gratitude, highlights, challenges, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE
        mood=VALUES(mood),
        gratitude=VALUES(gratitude),
        highlights=VALUES(highlights),
        challenges=VALUES(challenges),
        notes=VALUES(notes),
        updated_at=NOW(3)
      `,
      values
    );
  }

  return getReflectionByDate(userId, date);
}

export async function listReflections(
  userId: number,
  opts?: { limit?: number; offset?: number }
) {
  const limit = opts?.limit ?? 120;
  const offset = opts?.offset ?? 0;

  const [rows] = await pool.query<ReflectionRow[]>(
    `SELECT *
     FROM reflections
     WHERE user_id=?
     ORDER BY reflect_date DESC, updated_at DESC
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );

  return rows;
}

export async function deleteAllReflections(userId: number) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM reflections WHERE user_id=?`,
    [userId]
  );

  return result.affectedRows;
}
