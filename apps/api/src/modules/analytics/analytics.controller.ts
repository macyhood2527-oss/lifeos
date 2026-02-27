import type { Request, Response } from "express";
import { z } from "zod";
import { getWeeklyAnalytics } from "./analytics.service";

const WeeklyQuerySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function weekly(req: Request, res: Response) {
  const userId = (req.user as any).id as number;

  const q = WeeklyQuerySchema.parse(req.query);
  const data = await getWeeklyAnalytics(userId, { weekStart: q.weekStart });

  return res.json(data);
}

