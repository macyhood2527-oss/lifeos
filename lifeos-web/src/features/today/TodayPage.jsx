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
  const [error, setError] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reflection, setReflection] = useState(null);
  const [weekly, setWeekly] = useState(null);

  // 🔁 Central reload function
  const reload = useCallback(async () => {
    try {
      const [t, h, r, w] = await Promise.all([
        getTodayTasks(),
        getHabits(),
        getTodayReflection(),
        getWeeklyAnalytics(),
      ]);

      setTasks(t ?? []);
      setHabits(h ?? []);
      setReflection(r ?? null);
      setWeekly(w ?? null);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading today.");
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

    return (Array.isArray(tasks) ? tasks : [])
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

      {/* ❗ Error State */}
      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      )}

      {/* 🌿 Today Summary */}
      <Section
        title="Today"
        subtitle={`${tasks.length} tasks • ${habits.length} habits`}
      >
        {weekly?.gentle_recap ? (
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
      <Section
        title="Habits"
        subtitle="Small check-ins, steady progress."
      >
        {habits.length === 0 ? (
          <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
            No habits yet. Start with one tiny daily ritual.
          </div>
        ) : (
          <HabitList
            habits={habits}
            onCheckedIn={reload}
          />
        )}
      </Section>

      {/* 📋 Tasks */}
      <Section
        title="Tasks"
        subtitle="One clear next step is enough."
      >
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
      <Section
        title="Reflection"
        subtitle="A gentle note for your future self."
      >
        <ReflectionComposer
          initial={reflection}
          onSaved={reload}
        />
      </Section>

    </div>
  );
}