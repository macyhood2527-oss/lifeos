import { apiFetch } from "../../shared/api/http";

export function notifyRemindersChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("lifeos-reminders-changed"));
}

export async function listReminders() {
  const data = await apiFetch("/api/reminders");
  return data?.reminders ?? [];
}

export async function getReminderSummary() {
  const data = await apiFetch("/api/reminders/summary");
  return data?.summary ?? { total: 0, enabled: 0, paused: 0, due: 0 };
}

export async function createReminder(payload) {
  const data = await apiFetch("/api/reminders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data?.reminder ?? data;
}

export async function deleteAllReminders() {
  const data = await apiFetch("/api/reminders?all=true", {
    method: "DELETE",
  });
  return Number(data?.deleted ?? 0);
}

export async function updateReminder(reminderId, patch) {
  const data = await apiFetch(`/api/reminders/${reminderId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data?.reminder ?? data;
}

export async function deleteReminder(reminderId) {
  const data = await apiFetch(`/api/reminders/${reminderId}`, {
    method: "DELETE",
  });
  return data?.ok === true;
}

export async function sendReminderNow(reminderId) {
  return apiFetch(`/api/reminders/${reminderId}/send-now`, {
    method: "POST",
  });
}

export async function handleReminderToday(reminderId) {
  const data = await apiFetch(`/api/reminders/${reminderId}/handle-today`, {
    method: "POST",
  });
  return data?.reminder ?? data;
}
