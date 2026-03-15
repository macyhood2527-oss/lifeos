import { useEffect, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import Section from "../../shared/ui/Section";
import { listHabits } from "../habits/habits.api";
import { listTasks } from "../tasks/tasks.api";
import {
  deleteReminder,
  handleReminderToday,
  listReminders,
  notifyRemindersChanged,
  sendReminderNow,
  updateReminder,
} from "./reminders.api";
import ReminderActionCard from "./components/ReminderActionCard";
import { enrichReminder } from "./reminders.utils";
import { Icons } from "../../config/icons";

function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("all");
  const [remindersQuery, tasksQuery, habitsQuery] = useQueries({
    queries: [
      { queryKey: ["reminders", "list"], queryFn: () => listReminders() },
      { queryKey: ["tasks", "all"], queryFn: () => listTasks({ includeDone: true }) },
      { queryKey: ["habits", "all"], queryFn: () => listHabits({ includeInactive: true }) },
    ],
  });
  const reminders = remindersQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const loading = remindersQuery.isLoading || tasksQuery.isLoading || habitsQuery.isLoading;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const taskMap = useMemo(() => {
    const map = new Map();
    for (const task of tasks) map.set(Number(task.id), task);
    return map;
  }, [tasks]);

  const habitMap = useMemo(() => {
    const map = new Map();
    for (const habit of habits) map.set(Number(habit.id), habit);
    return map;
  }, [habits]);

  const enriched = useMemo(() => {
    return [...reminders]
      .map((reminder) => enrichReminder(reminder, { taskMap, habitMap }))
      .sort((a, b) => String(a.sortValue).localeCompare(String(b.sortValue)));
  }, [habitMap, reminders, taskMap]);

  const stats = useMemo(() => {
    const total = enriched.length;
    const due = enriched.filter((item) => item.status === "due").length;
    const scheduled = enriched.filter((item) => item.status === "scheduled").length;
    const paused = enriched.filter((item) => item.status === "paused").length;
    return { total, due, scheduled, paused };
  }, [enriched]);

  const visible = useMemo(() => {
    if (filter === "all") return enriched;
    return enriched.filter((item) => item.status === filter);
  }, [enriched, filter]);

  async function toggleEnabled(reminder) {
    try {
      setBusyId(reminder.id);
      const next = await updateReminder(reminder.id, {
        enabled: Number(reminder.enabled) === 0,
      });
      queryClient.setQueryData(["reminders", "list"], (current = []) =>
        current.map((item) => (item.id === next.id ? next : item))
      );
      notifyRemindersChanged();
      setToast({
        tone: "ok",
        message: Number(reminder.enabled) === 0 ? "Reminder resumed." : "Reminder paused.",
      });
    } catch {
      setToast({ tone: "warn", message: "Couldn’t update reminder." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(reminder) {
    try {
      setBusyId(reminder.id);
      await deleteReminder(reminder.id);
      queryClient.setQueryData(["reminders", "list"], (current = []) =>
        current.filter((item) => item.id !== reminder.id)
      );
      notifyRemindersChanged();
      setToast({ tone: "ok", message: "Reminder removed." });
    } catch {
      setToast({ tone: "warn", message: "Couldn’t remove reminder." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleTest(reminder) {
    try {
      setBusyId(reminder.id);
      await sendReminderNow(reminder.id);
      setToast({ tone: "ok", message: "Test reminder requested." });
    } catch {
      setToast({ tone: "warn", message: "Couldn’t send test reminder." });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToday(reminder) {
    try {
      setBusyId(reminder.id);
      const next = await handleReminderToday(reminder.id);
      queryClient.setQueryData(["reminders", "list"], (current = []) =>
        current.map((item) => (item.id === next.id ? next : item))
      );
      notifyRemindersChanged();
      setToast({ tone: "ok", message: "Handled for today." });
    } catch {
      setToast({ tone: "warn", message: "Couldn’t mark reminder handled." });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white/55 p-5 text-sm text-stone-600 shadow-sm backdrop-blur-md">
        Loading reminders gently…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={[
              "rounded-2xl border px-4 py-2 text-xs shadow-sm backdrop-blur",
              "bg-white/90",
              toast.tone === "warn"
                ? "border-rose-200 text-rose-700"
                : "border-emerald-200 text-emerald-800",
            ].join(" ")}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <GlassPanel>
        <Section title="Reminders" subtitle="See every upcoming nudge in one calm place." icon={Icons.reminders}>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
              <div className="text-[11px] text-stone-500">Total</div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{stats.total}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2">
              <div className="text-[11px] text-amber-800">Due now</div>
              <div className="mt-1 text-sm font-semibold text-amber-900">{stats.due}</div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2">
              <div className="text-[11px] text-sky-800">Scheduled</div>
              <div className="mt-1 text-sm font-semibold text-sky-900">{stats.scheduled}</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2">
              <div className="text-[11px] text-stone-500">Paused</div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{stats.paused}</div>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: "All" },
              { id: "due", label: "Due now" },
              { id: "scheduled", label: "Scheduled" },
              { id: "paused", label: "Paused" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={[
                  "rounded-full border px-2.5 py-1 text-[11px] transition",
                  filter === option.id
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-black/10 bg-white/80 text-stone-700 hover:bg-stone-50",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                Promise.all([
                  remindersQuery.refetch(),
                  tasksQuery.refetch(),
                  habitsQuery.refetch(),
                ]).catch(() => {
                  setToast({ tone: "warn", message: "Couldn’t load reminders right now." });
                })
              }
              className="ml-auto rounded-xl border border-black/10 bg-white px-3 py-2 text-[11px] text-stone-700 hover:bg-stone-50"
            >
              Refresh
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4 text-sm text-stone-600">
              No reminders in this view yet. Add one from a task or habit card when you’re ready.
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((reminder) => {
                const isBusy = busyId === reminder.id;

                return (
                  <ReminderActionCard
                    key={reminder.id}
                    reminder={reminder}
                    busy={isBusy}
                    tone="stone"
                    showDelete
                    onHandledToday={handleToday}
                    onToggleEnabled={toggleEnabled}
                    onTestNow={handleTest}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          )}
        </Section>
      </GlassPanel>
    </div>
  );
}
