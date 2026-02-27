import { useEffect, useState } from "react";
import HabitList from "../habits/components/HabitList";
import TaskList from "../tasks/components/TaskList";
import TaskComposer from "../tasks/components/TaskComposer";
import ReflectionComposer from "../reflections/components/ReflectionComposer";

import {
  getWeeklyAnalytics,
  getTodayTasks,
  getHabits,
  getTodayReflection,
} from "./today.api";

export default function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [reflection, setReflection] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [toast, setToast] = useState(null); // string | null

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
  }, []);

  if (loading) {
    return <div className="text-stone-500">Loading gently...</div>;
  }


  function showToast(message) {
  setToast(message);
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => setToast(null), 1600);
}

  return (
    <div className="space-y-8">

      {toast ? (
  <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 shadow-sm">
      {toast}
    </div>
  </div>
) : null}

      <section>
        <h2 className="text-lg font-semibold text-stone-900">Today</h2>
        <p className="text-sm text-stone-600">
          {tasks.length} tasks • {habits.length} habits
        </p>
      </section>

      {weekly && (
        <section className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-900">
            {weekly.gentle_recap ?? "You're doing great this week."}
          </p>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Habits</h3>
        <HabitList habits={habits} onCheckedIn={reload} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Tasks</h3>
        <TaskComposer onCreated={reload} />
        <TaskList tasks={tasks} onUpdated={reload} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-700">Reflection</h3>
       <ReflectionComposer
  initial={reflection}
  onSaved={async () => {
    await reload();
    showToast("Reflection saved for today ✓");
  }}
/>
      </section>
    </div>
  );
}