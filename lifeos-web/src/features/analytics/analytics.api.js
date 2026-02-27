import { apiFetch } from "../../shared/api/http";

// weekStart is optional "YYYY-MM-DD" (must be MONDAY to align with backend)
export async function getWeeklyAnalytics({ weekStart } = {}) {
  const qs = weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : "";
  return apiFetch(`/api/analytics/weekly${qs}`);
}