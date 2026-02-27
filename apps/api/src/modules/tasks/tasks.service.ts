import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

type TaskRow = RowDataPacket & {
  id: number;
  user_id: number;
  project_id: number | null;
  title: string;
  notes: string | null;
  status: "backlog" | "todo" | "doing" | "done";
  priority: "low" | "medium" | "high";
  due_date: string | null;        // DATE comes as string
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function createTask(userId: number, input: {
  project_id?: number | null;
  title: string;
  notes?: string | null;
  status?: TaskRow["status"];
  priority?: TaskRow["priority"];
  due_date?: string | null;
  sort_order?: number;
}) {
  const status = input.status ?? "todo";
  const isDone = status === "done";

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO tasks
     (user_id, project_id, title, notes, status, priority, due_date, completed_at, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
    [
      userId,
      input.project_id ?? null,
      input.title,
      input.notes ?? null,
      status,
      input.priority ?? "medium",
      input.due_date ?? null,
      isDone ? new Date() : null,
      input.sort_order ?? 0
    ]
  );

  return getTaskById(userId, Number(result.insertId));
}

export async function getTaskById(userId: number, taskId: number) {
  const [rows] = await pool.query<TaskRow[]>(
    `SELECT * FROM tasks WHERE user_id = ? AND id = ? LIMIT 1`,
    [userId, taskId]
  );
  return rows[0] ?? null;
}

export async function listTasks(userId: number, filters: {
  status?: TaskRow["status"];
  project_id?: number;
  includeDone?: boolean;
  due_date?: string;
}) {

  const clauses: string[] = ["user_id = ?"];
  const params: any[] = [userId];

  if (filters.status) {
    clauses.push("status = ?");
    params.push(filters.status);
  }
  if (filters.project_id) {
    clauses.push("project_id = ?");
    params.push(filters.project_id);
  }
  if (!filters.includeDone) {
    clauses.push("status <> 'done'");
  }

  if (filters.due_date) {
  clauses.push("due_date = ?");
  params.push(filters.due_date);
}

  const [rows] = await pool.query<TaskRow[]>(
    `SELECT * FROM tasks
     WHERE ${clauses.join(" AND ")}
     ORDER BY status ASC, sort_order ASC, created_at DESC`,
    params
  );

  return rows;
}

export async function updateTask(userId: number, taskId: number, patch: {
  project_id?: number | null;
  title?: string;
  notes?: string | null;
  status?: TaskRow["status"];
  priority?: TaskRow["priority"];
  due_date?: string | null;
  sort_order?: number;
}) {
  // Determine completed_at behavior if status changes
  let completedAtSql: string | null = null; // null means "do not touch"
  if (patch.status) {
    completedAtSql = patch.status === "done" ? "NOW(3)" : "NULL";
  }

  const fields: string[] = [];
  const values: any[] = [];

  if (patch.project_id !== undefined) { fields.push("project_id=?"); values.push(patch.project_id); }
  if (patch.title !== undefined) { fields.push("title=?"); values.push(patch.title); }
  if (patch.notes !== undefined) { fields.push("notes=?"); values.push(patch.notes); }
  if (patch.status !== undefined) { fields.push("status=?"); values.push(patch.status); }
  if (patch.priority !== undefined) { fields.push("priority=?"); values.push(patch.priority); }
  if (patch.due_date !== undefined) { fields.push("due_date=?"); values.push(patch.due_date); }
  if (patch.sort_order !== undefined) { fields.push("sort_order=?"); values.push(patch.sort_order); }

  if (completedAtSql !== null) {
    fields.push(`completed_at=${completedAtSql}`);
  }

  if (fields.length === 0) return getTaskById(userId, taskId);

  values.push(userId, taskId);

  await pool.execute(
    `UPDATE tasks SET ${fields.join(", ")}, updated_at=NOW(3)
     WHERE user_id=? AND id=?`,
    values
  );

  return getTaskById(userId, taskId);
}

export async function deleteTask(userId: number, taskId: number) {
  // MVP: hard delete. (We can switch to archived_at later if you want)
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM tasks WHERE user_id = ? AND id = ?`,
    [userId, taskId]
  );
  return result.affectedRows > 0;
}