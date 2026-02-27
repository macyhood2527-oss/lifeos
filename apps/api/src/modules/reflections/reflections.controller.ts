import type { Request, Response } from "express";
import * as service from "./reflections.service";
import { getUserSettings } from "../users/users.service";
import { formatYYYYMMDDInTZ } from "../../utils/time";

export async function getToday(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  const settings = await getUserSettings(userId);
  const tz = settings?.timezone || "Asia/Manila";
  const today = formatYYYYMMDDInTZ(new Date(), tz);

  const reflection = await service.getReflectionByDate(userId, today);
  return res.json({ reflection });
}

export async function upsertToday(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  const settings = await getUserSettings(userId);
  const tz = settings?.timezone || "Asia/Manila";
  const today = formatYYYYMMDDInTZ(new Date(), tz);

  const reflection = await service.upsertReflection(userId, today, req.body);

  return res.json({ reflection });
}

export async function list(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  // B2 needs enough data to mark calendar days.
  // 120 = roughly 4 months of daily reflections (safe default).
  const limit = req.query.limit ? Math.min(400, Number(req.query.limit)) : 120;
  const offset = req.query.offset ? Math.max(0, Number(req.query.offset)) : 0;

  const reflections = await service.listReflections(userId, { limit, offset });
  return res.json({ reflections });
}

export async function getByDate(req: Request, res: Response) {
  const userId = (req.user as any).id as number;
const raw = req.params.date;
const date = Array.isArray(raw) ? raw[0] : raw;

  const reflection = await service.getReflectionByDate(userId, date);
  if (!reflection) return res.status(404).json({ error: "Reflection not found" });

  return res.json({ reflection });
}