import { listCheckinsInRange } from "../repos/habits.repo.js";

/**
 * Daily streak:
 * - streak is number of consecutive days with check-ins ending at `endDate` (inclusive).
 * - endDate is a local date string "YYYY-MM-DD" in user's timezone.
 *
 * Efficient approach:
 * - Fetch last N days of checkins (e.g., 120) then walk backwards.
 */
export async function computeDailyStreak({ habitId, endDate, lookbackDays = 120 }) {
  // Compute startDate = endDate - lookbackDays
  const startDate = shiftDate(endDate, -lookbackDays);

  const checkins = await listCheckinsInRange(habitId, startDate, endDate);
  const set = new Set(checkins);

  let streak = 0;
  let cursor = endDate;

  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }

  return { streak, asOf: endDate };
}

function shiftDate(dateStr, deltaDays) {
  // dateStr: YYYY-MM-DD; keep it pure date arithmetic in UTC to avoid tz issues
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return toDateStr(dt);
}

function toDateStr(dt) {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}