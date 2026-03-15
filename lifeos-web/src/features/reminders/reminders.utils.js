export function reminderTime(reminder) {
  return reminder?.next_run_at ?? reminder?.due_at ?? reminder?.created_at ?? "";
}

export function formatReminderWhen(value) {
  if (!value) return "No next run scheduled";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Time unavailable";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function summarizeReminderSchedule(reminder) {
  if (reminder?.due_at) return `One time • ${formatReminderWhen(reminder.due_at)}`;
  if (reminder?.schedule_type === "weekly") {
    const days = String(reminder?.days_of_week ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");
    return `Weekly • ${String(reminder?.time_of_day ?? "").slice(0, 5)}${days ? ` • ${days}` : ""}`;
  }
  return `Daily • ${String(reminder?.time_of_day ?? "").slice(0, 5) || "time not set"}`;
}

export function statusForReminder(reminder) {
  if (Number(reminder?.enabled) === 0) return "paused";

  const next = reminderTime(reminder);
  if (!next) return "scheduled";

  const nextMs = new Date(next).getTime();
  if (Number.isNaN(nextMs)) return "scheduled";

  if (nextMs < Date.now()) return "due";
  return "scheduled";
}

export function enrichReminder(reminder, { taskMap, habitMap }) {
  const entityId = Number(reminder.entity_id);
  const source = reminder.entity_type === "task" ? taskMap.get(entityId) : habitMap.get(entityId);

  return {
    ...reminder,
    status: statusForReminder(reminder),
    sortValue: reminderTime(reminder),
    entityLabel:
      reminder.entity_type === "task"
        ? source?.title ?? `Task #${entityId}`
        : source?.name ?? `Habit #${entityId}`,
    entityHref:
      reminder.entity_type === "task"
        ? `/tasks?item=${entityId}&reminder=1`
        : `/habits?item=${entityId}&reminder=1`,
  };
}
