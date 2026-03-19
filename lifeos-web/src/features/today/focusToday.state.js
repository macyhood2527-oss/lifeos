const STORAGE_KEY = "lifeos_focus_today_v1";

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeTaskIds(taskIds) {
  if (!Array.isArray(taskIds)) return [];

  const seen = new Set();
  const next = [];

  for (const value of taskIds) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
    if (next.length >= 3) break;
  }

  return next;
}

function normalizeHabitId(habitId) {
  const id = Number(habitId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeIntention(intention) {
  return String(intention || "").trim().slice(0, 120);
}

function normalizeFocusToday(value) {
  const raw = value && typeof value === "object" ? value : {};

  return {
    date: typeof raw.date === "string" ? raw.date : getTodayKey(),
    taskIds: normalizeTaskIds(raw.taskIds),
    habitId: normalizeHabitId(raw.habitId),
    intention: normalizeIntention(raw.intention),
  };
}

export function loadFocusToday() {
  if (typeof window === "undefined") {
    return normalizeFocusToday(null);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeFocusToday(null);

    const parsed = normalizeFocusToday(JSON.parse(raw));
    if (parsed.date !== getTodayKey()) return normalizeFocusToday(null);
    return parsed;
  } catch {
    return normalizeFocusToday(null);
  }
}

export function saveFocusToday(value) {
  if (typeof window === "undefined") return normalizeFocusToday(value);

  const next = normalizeFocusToday({
    ...value,
    date: getTodayKey(),
  });

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("lifeos-focus-today-changed"));
  return next;
}
