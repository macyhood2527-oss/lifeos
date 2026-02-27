import { apiFetch } from "../../shared/api/http";

export async function listHabits({ includeInactive = false } = {}) {
  const res = await apiFetch(`/api/habits?includeInactive=${includeInactive ? "true" : "false"}`);
  return res.habits ?? [];
}

export function createHabit(payload) {
  return apiFetch("/api/habits", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then((r) => r.habit);
}

export function updateHabit(habitId, patch) {
  return apiFetch(`/api/habits/${habitId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((r) => r.habit);
}

export function deleteHabit(habitId) {
  return apiFetch(`/api/habits/${habitId}`, { method: "DELETE" });
}

// checkin stays same
export function checkinHabit(habitId, payload = {}) {
  return apiFetch(`/api/habits/${habitId}/checkins`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}