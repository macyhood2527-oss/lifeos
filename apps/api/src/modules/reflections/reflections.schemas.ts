import { z } from "zod";

export const UpsertReflectionSchema = z.object({
  reflect_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: z.number().int().min(1).max(10).optional().nullable(),
  gratitude: z.string().max(10000).optional().nullable(),
  highlights: z.string().max(10000).optional().nullable(),
  challenges: z.string().max(10000).optional().nullable(),
  notes: z.string().max(20000).optional().nullable()
});