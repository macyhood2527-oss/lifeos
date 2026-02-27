import { z } from "zod";

export const TaskStatus = z.enum(["backlog", "todo", "doing", "done"]);
export const TaskPriority = z.enum(["low", "medium", "high"]);

export const CreateTaskSchema = z.object({
  project_id: z.number().int().positive().optional().nullable(),
  title: z.string().min(1).max(255),
  notes: z.string().max(20000).optional().nullable(),
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(), // YYYY-MM-DD
  sort_order: z.number().int().min(0).max(100000).optional()
});

export const UpdateTaskSchema = CreateTaskSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field must be provided" }
);