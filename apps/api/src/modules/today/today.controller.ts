import type { Request, Response } from "express";
import { getTodayPayload } from "./today.service";
import { getUserSettings } from "../users/users.service";
import { formatYYYYMMDDInTZ } from "../../utils/time";

export async function today(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  const settings = await getUserSettings(userId);
  const tz = settings?.timezone || "Asia/Manila";

  const today = formatYYYYMMDDInTZ(new Date(), tz);

  const payload = await getTodayPayload(userId, today);
  return res.json(payload);
}