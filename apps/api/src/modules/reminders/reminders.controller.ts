import type { Request, Response } from "express";
import { CreateReminderSchema, UpdateReminderSchema } from "./reminders.schemas";
import * as service from "./reminders.service";

export async function create(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const input = CreateReminderSchema.parse(req.body);
  const reminder = await service.createReminder(userId, input);
  return res.status(201).json({ reminder });
}

export async function list(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const reminders = await service.listReminders(userId);
  return res.json({ reminders });
}

export async function patch(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const id = Number(req.params.id);
  const patchBody = UpdateReminderSchema.parse(req.body);
  const reminder = await service.updateReminder(userId, id, patchBody);
  if (!reminder) return res.status(404).json({ error: "Reminder not found" });
  return res.json({ reminder });
}

export async function remove(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const id = Number(req.params.id);
  const ok = await service.deleteReminder(userId, id);
  if (!ok) return res.status(404).json({ error: "Reminder not found" });
  return res.json({ ok: true });
}

// ✅ NEW: send this reminder immediately (for testing / manual nudge)
export async function sendNow(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const id = Number(req.params.id);

  const result = await service.sendReminderNow(userId, id);

  if (!result) return res.status(404).json({ error: "Reminder not found" });

  // result includes status summary; keep response gentle and clear
  return res.json({ ok: true, ...result });
}