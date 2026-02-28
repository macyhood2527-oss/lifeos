import { useCallback, useEffect, useMemo, useState } from "react";
import Section from "../../shared/ui/Section";
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

export default function TodayPage() {
  const [loading, setLoading] = useState(true);

  // Keep error messages specific per section so one failure doesn't blank the page
  const [summaryError, setSummaryError] = useState(null);
  const [habitsError, setHabitsError] = useState(null);
  const [tasksError, setTasksError] = useState(null);
  const [reflectionError, setReflectionError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reflection, setReflection] = useState(null);
  const [weekly, setWeekly] = useState(null);

  // 🔁 Central reload function (won't fail whole page if one endpoint fails)
  const reload = useCallback(async () => {
    setSummaryError(null);
    setHabitsError(null);
    setTasksError(null);
    setReflectionError(null);

    const results = await Promise.allSettled([
      getTodayTasks(),        // 0
      getHabits(),            // 1
      getTodayReflection(),   // 2
      getWeeklyAnalytics(),   // 3
    ]);

    // --- tasks ---
    if (results[0].status === "fulfilled") {
      setTasks(results[0].value ?? []);
    } else {
      console.error("getTodayTasks failed:", results[0].reason);
      setTasks([]); // keep UI stable
      setTasksError("Tasks couldn't load right now.");
    }

    // --- habits ---
    if (results[1].status === "fulfilled") {
      setHabits(results[1].value ?? []);
    } else {
      console.error("getHabits failed:", results[1].reason);
      setHabits([]); // keep UI stable
      setHabitsError("Habits couldn't load right now.");
    }

    // --- reflection ---
    if (results[2].status === "fulfilled") {
      setReflection(results[2].value ?? null);
    } else {
      console.error("getTodayReflection failed:", results[2].reason);
      setReflection(null);
      setReflectionError("Reflection couldn't load right now.");
    }

    // --- weekly analytics / recap ---
    if (results[3].status === "fulfilled") {
      setWeekly(results[3].value ?? null);
    } else {
      console.error("getWeeklyAnalytics failed:", results[3].reason);
      setWeekly(null);
      setSummaryError("Summary couldn't load right now.");
    }
  }, []);

  // 🚀 Initial load
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

  // 🎯 Top 5 prioritized tasks for Today page
  const topTasks = useMemo(() => {
    const rank = { high: 0, medium: 1, low: 2 };

    return (Array.isArray(tasks) ? [...tasks] : [])
      // not-done first
      .sort((a, b) => {
        const ad = a.status === "done" ? 1 : 0;
        const bd = b.status === "done" ? 1 : 0;
        if (ad !== bd) return ad - bd;

        // priority high -> low
        const ap = rank[a.priority] ?? 1;
        const bp = rank[b.priority] ?? 1;
        if (ap !== bp) return ap - bp;

        // oldest -> newest
        const at = new Date(a.created_at ?? 0).getTime();
        const bt = new Date(b.created_at ?? 0).getTime();
        return at - bt;
      })
      .slice(0, 5);
  }, [tasks]);

  // ⏳ Loading state
  if (loading) {
    return <div className="text-stone-500">Loading gently...</div>;
  }

  return (
    <div className="space-y-8">
      {/* 🌿 Today Summary */}
      <Section
        title="Today"
        subtitle={`${tasks.length} tasks • ${habits.length} habits`}
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
      </Section>

      <NotificationsCard />

      {/* 🌱 Habits */}
      <Section title="Habits" subtitle="Small check-ins, steady progress.">
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
      </Section>

      {/* 📋 Tasks */}
      <Section title="Tasks" subtitle="One clear next step is enough.">
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

        {/* View all tasks link */}
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
      </Section>

      {/* 🌸 Reflection */}
      <Section title="Reflection" subtitle="A gentle note for your future self.">
        {reflectionError && (
          <div className="mb-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {reflectionError}
          </div>
        )}

        <ReflectionComposer initial={reflection} onSaved={reload} />
      </Section>
    </div>
  );
}
