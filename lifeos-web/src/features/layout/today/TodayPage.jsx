import { useEffect, useState } from "react";
import HabitList from "../habits/components/HabitList";
import TaskList from "../tasks/components/TaskList";
import TaskComposer from "../tasks/components/TaskComposer";
import ReflectionComposer from "../reflections/components/ReflectionComposer";

// ✅ adjust if your path differs
import NotificationsCard from "../notifications/NotificationsCard";

import {
  getWeeklyAnalytics,
  getTodayTasks,
  getHabits,
  getTodayReflection,
} from "./today.api";

function GlassCard({ title, subtitle, accent = "emerald", children }) {
  const accentBar =
    accent === "rose"
      ? "bg-rose-200/70"
      : accent === "stone"
        ? "bg-stone-200/70"
        : "bg-emerald-200/70";

  return (
    <section className="rounded-3xl border border-black/5 bg-white/70 shadow-sm backdrop-blur">
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-xs text-stone-600">{subtitle}</p>
            ) : null}
          </div>

          <div className="mt-1 h-2 w-10 rounded-full border border-black/5 bg-white/60 overflow-hidden">
            <div className={`h-full w-full ${accentBar}`} />
          </div>
        </div>

        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      </div>

      <div className="p-4">{children}</div>
    </section>
  );
}

function SoftSectionSpacer() {
  return (
    <div className="py-1">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
    </div>
  );
}

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reflection, setReflection] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [toast, setToast] = useState(null);

  async function reload() {
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
  }

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 1600);
  }

  if (loading) {
    return <div className="text-stone-500">Loading gently...</div>;
  }

  return (
    // ✅ more breathing room overall
    <div className="space-y-7">
      {/* Toast */}
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 shadow-sm">
            {toast}
          </div>
        </div>
      ) : null}

      {/* Today summary card */}
      <section className="rounded-3xl border border-black/5 bg-white/65 p-4 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Today</h2>
            <p className="mt-1 text-sm text-stone-600">
              {tasks.length} tasks • {habits.length} habits
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2 text-xs text-stone-600">
            calm pace ✿
          </div>
        </div>

        {weekly ? (
          <div className="mt-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-3">
            <p className="text-sm text-emerald-900">
              {weekly.gentle_recap ?? "You're doing great this week."}
            </p>
          </div>
        ) : null}
      </section>

      {/* ✅ Notifications in its own panel (separate, with spacing) */}
      <GlassCard
        title="Notifications"
        subtitle="Gentle reminders — respectful of your timezone and quiet hours."
        accent="emerald"
      >
        <NotificationsCard />
      </GlassCard>

      <SoftSectionSpacer />

      {/* Habits card */}
      <GlassCard
        title="Habits"
        subtitle="Small check-ins, steady progress."
        accent="emerald"
      >
        <HabitList habits={habits} onCheckedIn={reload} />
      </GlassCard>

      <SoftSectionSpacer />

      {/* Tasks card */}
      <GlassCard
        title="Tasks"
        subtitle="One clear next step is enough."
        accent="stone"
      >
        <div className="space-y-3">
          <TaskComposer onCreated={reload} />
          <TaskList tasks={tasks} onUpdated={reload} />
        </div>
      </GlassCard>

      <SoftSectionSpacer />

      {/* Reflection card */}
      <GlassCard
        title="Reflection"
        subtitle="A gentle note for your future self."
        accent="rose"
      >
        <ReflectionComposer
          initial={reflection}
          onSaved={async () => {
            await reload();
            showToast("Reflection saved for today ✓");
          }}
        />
      </GlassCard>
    </div>
  );
}
