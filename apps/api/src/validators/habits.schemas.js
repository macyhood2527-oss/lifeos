import { z } from "zod";

export const HabitCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),

  // Keep it flexible now; expand later
  schedule_type: z.enum(["daily", "weekly"]).default("daily"),

  // For weekly habits: ["mon","wed","fri"] etc (stored as SET or JSON; see repo)
  days_of_week: z
    .array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]))
    .optional()
    .default([]),

  is_active: z.boolean().optional().default(true),
});

export const HabitUpdateSchema = HabitCreateSchema.partial();

export const HabitCheckinSchema = z.object({
  // Local date string in user's timezone, e.g. "2026-02-26"
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});