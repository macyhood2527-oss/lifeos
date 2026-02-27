import type { Request, Response } from "express";
import { CreateTaskSchema, UpdateTaskSchema } from "./tasks.schemas";
import * as service from "./tasks.service";

export async function create(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const input = CreateTaskSchema.parse(req.body);

  const task = await service.createTask(userId, input as any);
  return res.status(201).json({ task });
}

import { getUserSettings } from "../users/users.service";
import { formatYYYYMMDDInTZ } from "../../utils/time";

export async function list(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  const status = req.query.status as any;
  const project_id = req.query.project_id ? Number(req.query.project_id) : undefined;
  const includeDone = req.query.includeDone === "true";
  const scope = req.query.scope as string | undefined;

  let due_date: string | undefined;

  if (scope === "today") {
    const settings = await getUserSettings(userId);
    const tz = settings?.timezone || "Asia/Manila";
    due_date = formatYYYYMMDDInTZ(new Date(), tz);
  }

  const tasks = await service.listTasks(userId, {
    status,
    project_id,
    includeDone,
    due_date,
  });

  return res.json({ tasks });
}

export async function patch(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const taskId = Number(req.params.id);

  const patchBody = UpdateTaskSchema.parse(req.body);
  const task = await service.updateTask(userId, taskId, patchBody as any);

  if (!task) return res.status(404).json({ error: "Task not found" });
  return res.json({ task });
}

export async function remove(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const taskId = Number(req.params.id);

  const ok = await service.deleteTask(userId, taskId);
  if (!ok) return res.status(404).json({ error: "Task not found" });

  return res.json({ ok: true });
}