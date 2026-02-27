import {
  listHabits,
  getHabitById,
  createHabit,
  updateHabit,
  deleteHabit,
  createCheckin,
  deleteCheckin,
} from "../repos/habits.repo.js";
import { HabitCreateSchema, HabitUpdateSchema, HabitCheckinSchema } from "../validators/habits.schemas.js";
import { computeDailyStreak } from "../services/habits.streaks.js";

/**
 * For now, we default "today" to server date in YYYY-MM-DD.
 * Next milestone: derive today in user's timezone.
 */
function todayDateStr() {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function habitsList(req, res) {
  const userId = req.user.id;
  const habits = await listHabits(userId);
  res.json({ habits });
}

export async function habitsGet(req, res) {
  const userId = req.user.id;
  const habitId = Number(req.params.id);

  const habit = await getHabitById(userId, habitId);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  res.json({ habit });
}

export async function habitsCreate(req, res) {
  const userId = req.user.id;
  const data = HabitCreateSchema.parse(req.body);

  const habit = await createHabit(userId, data);
  res.status(201).json({ habit });
}

export async function habitsUpdate(req, res) {
  const userId = req.user.id;
  const habitId = Number(req.params.id);
  const patch = HabitUpdateSchema.parse(req.body);

  const existing = await getHabitById(userId, habitId);
  if (!existing) return res.status(404).json({ error: "Habit not found" });

  const habit = await updateHabit(userId, habitId, patch);
  res.json({ habit });
}

export async function habitsDelete(req, res) {
  const userId = req.user.id;
  const habitId = Number(req.params.id);

  const ok = await deleteHabit(userId, habitId);
  if (!ok) return res.status(404).json({ error: "Habit not found" });

  res.status(204).send();
}

export async function habitCheckin(req, res) {
  const userId = req.user.id;
  const habitId = Number(req.params.id);
  const { date } = HabitCheckinSchema.parse(req.body ?? {});

  const habit = await getHabitById(userId, habitId);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const dateStr = date ?? todayDateStr();
  await createCheckin(habitId, dateStr);

  // Return updated streak (daily for now)
  const streak = await computeDailyStreak({ habitId, endDate: dateStr });
  res.status(201).json({ ok: true, date: dateStr, streak });
}

export async function habitUncheck(req, res) {
  const userId = req.user.id;
  const habitId = Number(req.params.id);
  const { date } = HabitCheckinSchema.parse(req.body ?? {});

  const habit = await getHabitById(userId, habitId);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const dateStr = date ?? todayDateStr();
  const removed = await deleteCheckin(habitId, dateStr);

  const streak = await computeDailyStreak({ habitId, endDate: todayDateStr() });
  res.json({ ok: true, removed, date: dateStr, streak });
}

export async function habitStreak(req, res) {
  const userId = req.user.id;
  const habitId = Number(req.params.id);
  const endDate = req.query.asOf?.toString() || todayDateStr();

  const habit = await getHabitById(userId, habitId);
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const streak = await computeDailyStreak({ habitId, endDate });
  res.json({ habitId, streak });
}