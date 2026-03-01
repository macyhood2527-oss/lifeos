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

export default function TodayPage() {
  const [loading, setLoading] = useState(true);

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

    if (results[2].status === "fulfilled") setReflection(results[2].value ?? null);
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

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  return (
    // ✅ true separate panels with generous spacing
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
            One small step is enough today.
          </div>
        )}
      </GlassPanel>

      {/* 🔔  (own glass panel) */}
      <GlassPanel
        title="Soft Signals"
        subtitle="Personalize how LifeOS checks in with you."
      >
        {/* IMPORTANT: Card already has a panel.
            If you want a SINGLE panel look, we should make Card “flat”.
            For now: keep it, but it will look slightly nested. */}
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
      <GlassPanel title="Reflection" subtitle="A gentle note for your future self.">
        {reflectionError && (
          <div className="mb-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {reflectionError}
          </div>
        )}

        <ReflectionComposer initial={reflection} onSaved={reload} />
      </GlassPanel>
    </div>
  );
}
