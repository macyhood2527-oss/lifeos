import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

type ProjectRow = RowDataPacket & {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function createProject(userId: number, input: {
  name: string;
  description?: string | null;
  color?: string | null;
  sort_order?: number;
}) {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO projects (user_id, name, description, color, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))`,
    [userId, input.name, input.description ?? null, input.color ?? null, input.sort_order ?? 0]
  );

  const id = Number(result.insertId);
  return getProjectById(userId, id);
}

export async function listProjects(userId: number, opts?: { includeArchived?: boolean }) {
  const includeArchived = opts?.includeArchived ?? false;

  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT id, user_id, name, description, color, sort_order, archived_at, created_at, updated_at
     FROM projects
     WHERE user_id = ?
       AND (${includeArchived ? "1=1" : "archived_at IS NULL"})
     ORDER BY sort_order ASC, created_at DESC`,
    [userId]
  );

  return rows;
}

export async function getProjectById(userId: number, projectId: number) {
  const [rows] = await pool.query<ProjectRow[]>(
    `SELECT id, user_id, name, description, color, sort_order, archived_at, created_at, updated_at
     FROM projects
     WHERE user_id = ? AND id = ?
     LIMIT 1`,
    [userId, projectId]
  );

  return rows[0] ?? null;
}

export async function updateProject(userId: number, projectId: number, patch: {
  name?: string;
  description?: string | null;
  color?: string | null;
  sort_order?: number;
}) {
  // Build dynamic SET safely
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.name !== undefined) { fields.push("name = ?"); values.push(patch.name); }
  if (patch.description !== undefined) { fields.push("description = ?"); values.push(patch.description); }
  if (patch.color !== undefined) { fields.push("color = ?"); values.push(patch.color); }
  if (patch.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(patch.sort_order); }

  if (fields.length === 0) return getProjectById(userId, projectId);

  values.push(userId, projectId);

  await pool.execute(
    `UPDATE projects
     SET ${fields.join(", ")}, updated_at = NOW(3)
     WHERE user_id = ? AND id = ?`,
    values
  );

  return getProjectById(userId, projectId);
}

export async function archiveProject(userId: number, projectId: number) {
  await pool.execute(
    `UPDATE projects
     SET archived_at = NOW(3), updated_at = NOW(3)
     WHERE user_id = ? AND id = ?`,
    [userId, projectId]
  );

  return getProjectById(userId, projectId);
}