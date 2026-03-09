import { useCallback, useEffect, useMemo, useState } from "react";
import HabitList from "../habits/components/HabitList";
import TaskComposer from "../tasks/components/TaskComposer";
import TaskList from "../tasks/components/TaskList";
import ReflectionComposer from "../reflections/components/ReflectionComposer";
import NotificationsCard from "../notifications/NotificationsCard";

import {
  getWeeklyAnalytics,
  getTodayTasks,
  getHabits,
  getTodayReflection,
} from "./today.api";

function GlassPanel({ title, subtitle, children, rightSlot }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
            ) : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      </div>

      <div className="p-5">{children}</div>
    </section>
  );
}

function pickDailyMessage(messages, seedKey) {
  if (!messages?.length) return null;
  // stable daily pick (doesn't change on every refresh)
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const seed = `${seedKey ?? "lifeos"}-${y}-${m}-${day}`;

  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % messages.length;
  return messages[idx];
}

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [reflectionOpen, setReflectionOpen] = useState(true);

  const [summaryError, setSummaryError] = useState(null);
  const [habitsError, setHabitsError] = useState(null);
  const [tasksError, setTasksError] = useState(null);
  const [reflectionError, setReflectionError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reflection, setReflection] = useState(null);
  const [weekly, setWeekly] = useState(null);

  const reload = useCallback(async () => {
    setSummaryError(null);
    setHabitsError(null);
    setTasksError(null);
    setReflectionError(null);

    const results = await Promise.allSettled([
      getTodayTasks(),
      getHabits(),
      getTodayReflection(),
      getWeeklyAnalytics(),
    ]);

    if (results[0].status === "fulfilled") setTasks(results[0].value ?? []);
    else {
      console.error("getTodayTasks failed:", results[0].reason);
      setTasks([]);
      setTasksError("Tasks couldn't load right now.");
    }

    if (results[1].status === "fulfilled") setHabits(results[1].value ?? []);
    else {
      console.error("getHabits failed:", results[1].reason);
      setHabits([]);
      setHabitsError("Habits couldn't load right now.");
    }

    if (results[2].status === "fulfilled")
      setReflection(results[2].value ?? null);
    else {
      console.error("getTodayReflection failed:", results[2].reason);
      setReflection(null);
      setReflectionError("Reflection couldn't load right now.");
    }

    if (results[3].status === "fulfilled") setWeekly(results[3].value ?? null);
    else {
      console.error("getWeeklyAnalytics failed:", results[3].reason);
      setWeekly(null);
      setSummaryError("Summary couldn't load right now.");
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      await reload();
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [reload]);

  const topTasks = useMemo(() => {
    const rank = { high: 0, medium: 1, low: 2 };
    return (Array.isArray(tasks) ? [...tasks] : [])
      .sort((a, b) => {
        const ad = a.status === "done" ? 1 : 0;
        const bd = b.status === "done" ? 1 : 0;
        if (ad !== bd) return ad - bd;

        const ap = rank[a.priority] ?? 1;
        const bp = rank[b.priority] ?? 1;
        if (ap !== bp) return ap - bp;

        const at = new Date(a.created_at ?? 0).getTime();
        const bt = new Date(b.created_at ?? 0).getTime();
        return at - bt;
      })
      .slice(0, 5);
  }, [tasks]);

  const taskStats = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const total = list.length;
    const done = list.filter((t) => t.status === "done").length;
    const left = Math.max(0, total - done);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, left, percent };
  }, [tasks]);

  const habitStats = useMemo(() => {
    function getTarget(h) {
      return Number(h?.target_per_period ?? h?.target ?? 1) || 1;
    }

    function getProgress(h) {
      if (Number.isFinite(Number(h?.progress))) return Number(h.progress);
      if (h?.thisPeriodProgress?.value != null) return Number(h.thisPeriodProgress.value) || 0;
      if (h?.checked_in_today === true) return 1;
      return 0;
    }

    const list = Array.isArray(habits) ? habits : [];
    const total = list.length;
    const done = list.filter((h) => {
      const target = getTarget(h);
      const progress = Math.min(getProgress(h), target);
      return progress >= target;
    }).length;
    const left = Math.max(0, total - done);
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, left, percent };
  }, [habits]);

  const reflectionLogged = useMemo(() => {
    if (!reflection) return false;
    const hasMood = reflection?.mood != null;
    const hasText =
      Boolean(String(reflection?.gratitude ?? "").trim()) ||
      Boolean(String(reflection?.highlights ?? "").trim()) ||
      Boolean(String(reflection?.challenges ?? "").trim()) ||
      Boolean(String(reflection?.notes ?? "").trim());
    return hasMood || hasText;
  }, [reflection]);

  useEffect(() => {
    setReflectionOpen(!reflectionLogged);
  }, [reflectionLogged]);

  const fallbackMessages = useMemo(
    () => [
      // anchor (your original line)
      "One small step is enough today.",

      // gentle permission
      "You don’t have to carry everything today.",
      "It’s okay to move slowly. You’re still moving.",
      "Not everything needs to be solved right now.",
      "A calm pace still counts.",
      "If it feels heavy, shrink the goal.",
      "You’re allowed to take this gently.",
      "Soft progress is still progress.",

      // companion-like
      "Let’s keep it simple today — one small step.",
      "We’ll do one thing, then we rest.",
      "I’m here — pick the easiest next step.",
      "No pressure. Just one gentle win.",
      "We can start tiny and still be proud.",

      // motivational (soft, non-hustle)
      "Start where you are. One step is enough.",
      "Momentum comes from small starts.",
      "Choose one task that makes the day lighter.",
      "A little consistency beats a big burst.",
      "One finished thing can change your whole day.",

      // extra variety (still calm)
      "Today doesn’t need to be perfect to be meaningful.",
      "You’re not behind — you’re building your pace.",
      "Take a breath. Then take one step.",
      "Quiet days still count as progress.",
      "Small wins add up, gently.",
    ],
    []
  );

  const dailyMessage = useMemo(() => {
    // Seed can include counts so it feels “slightly aware” but stays stable per day.
    const seedKey = `today-${tasks.length}-${habits.length}`;
    return pickDailyMessage(fallbackMessages, seedKey);
  }, [fallbackMessages, tasks.length, habits.length]);

  // ✅ Replace plain text loader with your branded loader
  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white/55 p-5 text-sm text-stone-600 shadow-sm backdrop-blur-md">
        Loading gently…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 🌿 Today Summary */}
      <GlassPanel
        title="Today"
        subtitle={`${tasks.length} tasks • ${habits.length} habits`}
        rightSlot={
          <span className="rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-stone-600">
            calm pace ✿
          </span>
        }
      >
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
            <div className="text-[11px] text-stone-500">Tasks left</div>
            <div className="mt-1 text-sm font-semibold text-stone-900">{taskStats.left}</div>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
            <div className="text-[11px] text-stone-500">Habits due</div>
            <div className="mt-1 text-sm font-semibold text-stone-900">{habitStats.left}</div>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
            <div className="text-[11px] text-stone-500">Mood</div>
            <div className="mt-1 text-sm font-semibold text-stone-900">
              {reflectionLogged ? "Logged" : "Pending"}
            </div>
          </div>
        </div>

        {summaryError ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {summaryError}
          </div>
        ) : weekly?.gentle_recap ? (
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
            {weekly.gentle_recap}
          </div>
        ) : (
          <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
            {dailyMessage || "One small step is enough today."}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span>Tasks progress</span>
                <span className="font-medium text-stone-800">
                  {taskStats.done}/{taskStats.total}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full border border-black/5 bg-stone-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${taskStats.percent}%`,
                    background: "linear-gradient(90deg, #BBF7D0, #86EFAC)",
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-stone-600">
                <span>Habits progress</span>
                <span className="font-medium text-stone-800">
                  {habitStats.done}/{habitStats.total}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full border border-black/5 bg-stone-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${habitStats.percent}%`,
                    background: "linear-gradient(90deg, #BAE6FD, #C4B5FD)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* 🔔 Soft Signals */}
      <GlassPanel
        title="Soft Signals"
        subtitle="Personalize how LifeOS checks in with you."
      >
        <NotificationsCard />
      </GlassPanel>

      {/* 🌱 Habits */}
      <GlassPanel title="Habits" subtitle="Small check-ins, steady progress.">
        {habitsError ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {habitsError}
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
            No habits yet. Start with one tiny daily ritual.
          </div>
        ) : (
          <HabitList habits={habits} onCheckedIn={reload} />
        )}
      </GlassPanel>

      {/* 📋 Tasks */}
      <GlassPanel title="Tasks" subtitle="One clear next step is enough.">
        {tasksError && (
          <div className="mb-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {tasksError}
          </div>
        )}

        <TaskComposer
          onCreated={(newTask) => {
            if (newTask) setTasks((prev) => [newTask, ...(prev ?? [])]);
            return reload();
          }}
        />

        <div className="mt-3">
          {topTasks.length === 0 ? (
            <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
              Nothing scheduled for today. Add something gentle.
            </div>
          ) : (
            <TaskList tasks={topTasks} onUpdated={reload} />
          )}
        </div>

        {tasks.length > 5 && (
          <div className="mt-3 text-right">
            <a
              href="/tasks"
              className="text-sm text-emerald-900 underline underline-offset-4"
            >
              View all tasks →
            </a>
          </div>
        )}
      </GlassPanel>

      {/* 🌸 Reflection */}
      <GlassPanel
        title="Reflection"
        subtitle="A gentle note for your future self."
        rightSlot={
          <button
            type="button"
            onClick={() => setReflectionOpen((v) => !v)}
            className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
          >
            {reflectionOpen ? "Collapse" : reflectionLogged ? "Edit reflection" : "Open reflection"}
          </button>
        }
      >
        {reflectionError && (
          <div className="mb-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {reflectionError}
          </div>
        )}

        {!reflectionOpen && reflectionLogged ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
            Reflection logged for today. Tap <span className="font-medium">Edit reflection</span> to update it.
          </div>
        ) : (
          <ReflectionComposer initial={reflection} onSaved={reload} />
        )}
      </GlassPanel>
    </div>
  );
}
