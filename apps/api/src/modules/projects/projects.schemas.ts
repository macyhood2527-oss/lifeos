import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  color: z.string().max(16).optional().nullable(),
  sort_order: z.number().int().min(0).max(100000).optional()
});

export const UpdateProjectSchema = CreateProjectSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field must be provided" }
);