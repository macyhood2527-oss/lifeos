import { apiFetch } from "../../shared/api/http";

function asArray(data, key) {
  // supports:
  // 1) data is already an array -> return it
  // 2) data = { tasks: [...] } or { habits: [...] } -> return that
  // 3) data = { items: [...] } or { data: [...] } -> fallback common wrappers
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.rows)) return data.rows;
  }

  return [];
}

export async function getWeeklyAnalytics() {
  return apiFetch("/api/analytics/weekly");
}

export async function getTodayTasks() {
  const res = await apiFetch("/api/tasks?includeDone=true");
  return res.tasks ?? [];
}

export async function getHabits() {
  const data = await apiFetch("/api/habits");
  return data?.habits ?? [];
}

export async function getTodayReflection() {
  // this can be object or { reflection: {...} } depending on backend
  const data = await apiFetch("/api/reflections/today");
  if (data && typeof data === "object" && data.reflection) return data.reflection;
  return data ?? null;
}