import { z } from "zod";

export const HabitCadence = z.enum(["daily", "weekly"]);

export const CreateHabitSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  cadence: HabitCadence.optional(),
  target_per_period: z.number().int().min(1).max(1000).optional(),
  sort_order: z.number().int().min(0).max(100000).optional(),
  active: z.boolean().optional()
});

export const UpdateHabitSchema = CreateHabitSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field must be provided" }
);

export const HabitCheckinSchema = z.object({
  checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // default today
  value: z.number().int().min(1).max(1000).optional()
});