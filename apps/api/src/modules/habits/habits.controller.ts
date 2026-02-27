import type { Request, Response } from "express";
import { CreateHabitSchema, UpdateHabitSchema, HabitCheckinSchema } from "./habits.schemas";
import * as service from "./habits.service";

import { getUserSettings } from "../users/users.service";
import { formatYYYYMMDDInTZ } from "../../utils/time";

export async function create(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const input = CreateHabitSchema.parse(req.body);
  const habit = await service.createHabit(userId, input);
  return res.status(201).json({ habit });
}

export async function list(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const includeInactive = req.query.includeInactive === "true";

  const settings = await getUserSettings(userId);
  const tz = settings?.timezone || "Asia/Manila";

  const habits = await service.listHabitsWithProgress(userId, tz, { includeInactive });
  return res.json({ habits });
}

export async function patch(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const habitId = Number(req.params.id);
  const patchBody = UpdateHabitSchema.parse(req.body);
  const habit = await service.updateHabit(userId, habitId, patchBody);
  if (!habit) return res.status(404).json({ error: "Habit not found" });
  return res.json({ habit });
}

export async function remove(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const habitId = Number(req.params.id);
  await service.deleteHabit(userId, habitId);
  return res.json({ ok: true });
}

export async function checkin(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const habitId = Number(req.params.id);

  const input = HabitCheckinSchema.parse(req.body ?? {});

  // If client didn’t provide a date, compute "today" in user timezone
  if (!input.checkin_date) {
    const settings = await getUserSettings(userId);
    const tz = settings?.timezone || "Asia/Manila";
    const today = formatYYYYMMDDInTZ(new Date(), tz);
    (input as any).checkin_date = today;
  }

  const checkinRow = await service.checkinHabit(userId, habitId, input);
  if (!checkinRow) return res.status(404).json({ error: "Habit not found" });
  return res.status(201).json({ checkin: checkinRow });
}

export async function undo(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const habitId = Number(req.params.id);

  let checkin_date = typeof req.query.date === "string" ? req.query.date : undefined;
  if (!checkin_date) {
    const settings = await getUserSettings(userId);
    const tz = settings?.timezone || "Asia/Manila";
    checkin_date = formatYYYYMMDDInTZ(new Date(), tz);
  }

  const ok = await service.undoLatestCheckin(userId, habitId, checkin_date);
  return res.json({ ok });
}

export async function streak(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
  const habitId = Number(req.params.id);

  const settings = await getUserSettings(userId);
  const tz = settings?.timezone || "Asia/Manila";

  const data = await service.getHabitStreak(userId, habitId, tz);
  if (!data) return res.status(404).json({ error: "Habit not found" });
  return res.json(data);
}