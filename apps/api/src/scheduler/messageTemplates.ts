export function buildReminderText(input: {
  tone: "gentle" | "neutral" | "direct";
  entityType: "habit" | "task";
  title?: string;
}) {
  const base = input.title ? input.title : (input.entityType === "habit" ? "your habit" : "your task");

  if (input.tone === "direct") return `Reminder: ${base}`;
  if (input.tone === "neutral") return `Time for ${base}.`;
  return `Small steps count. Ready for ${base}?`;
}