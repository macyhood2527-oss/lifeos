import { z } from "zod";

export const ReminderEntityType = z.enum(["habit", "task"]);
export const ScheduleType = z.enum(["daily", "weekly", "cron"]);

export const DayToken = z.enum(["mon","tue","wed","thu","fri","sat","sun"]);

export const CreateReminderSchema = z.object({
  entity_type: ReminderEntityType,
  entity_id: z.number().int().positive(),

  schedule_type: ScheduleType.optional(),

  // daily/weekly
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),

  // weekly: MySQL SET tokens
  days_of_week: z.array(DayToken).optional().nullable(),

  // cron
  cron_expr: z.string().max(255).optional().nullable(),

  // one-off
  due_at: z.string().datetime().optional().nullable(),

  enabled: z.boolean().optional(),
  respect_quiet_hours: z.boolean().optional()
});

export const UpdateReminderSchema = CreateReminderSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: "At least one field must be provided" }
);