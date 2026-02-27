import { apiFetch } from "../../shared/api/http";

export async function getTodayReflection() {
  const data = await apiFetch("/api/reflections/today");
  return data?.reflection ?? data ?? null;
}

export async function upsertReflection(payload) {
  const data = await apiFetch("/api/reflections/today", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data?.reflection ?? data;
}

export async function listReflections({ limit = 120, offset = 0 } = {}) {
  const data = await apiFetch(`/api/reflections?limit=${limit}&offset=${offset}`);
  return data?.reflections ?? [];
}