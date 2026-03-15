import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import HabitList from "../habits/components/HabitList";
import TaskComposer from "../tasks/components/TaskComposer";
import TaskList from "../tasks/components/TaskList";
import ReflectionComposer from "../reflections/components/ReflectionComposer";
import {
  handleReminderToday,
  notifyRemindersChanged,
  sendReminderNow,
  updateReminder,
} from "../reminders/reminders.api";
import ReminderActionCard from "../reminders/components/ReminderActionCard";
import { enrichReminder } from "../reminders/reminders.utils";

import {
  getWeeklyAnalytics,
  getTodayTasks,
  getHabits,
  getTodayReflection,
  getReminders,
} from "./today.api";
import { Icons } from "../../config/icons";

function GlassPanel({ title, subtitle, children, rightSlot, icon: Icon }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {Icon ? <Icon size={18} strokeWidth={1.75} className="text-inherit opacity-85" /> : null}
              <h2 className="text-base font-semibold text-stone-900">{title}</h2>
            </div>
            {subtitle ? (
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-stone-600">{subtitle}</p>
            ) : null}
          </div>
          {rightSlot ? <div className="min-w-0 sm:shrink-0">{rightSlot}</div> : null}
        </div>

        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function LoadingCard({ lines = 3 }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
      <div className="animate-pulse space-y-2">
        {Array.from({ length: lines }).map((_, idx) => (
          <div key={idx} className="h-3 rounded-full bg-stone-200/80" />
        ))}
      </div>
    </div>
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
  const [reflectionOpen, setReflectionOpen] = useState(true);
  const [remindersReady, setRemindersReady] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [reminderActionId, setReminderActionId] = useState(null);
  const [reminderToast, setReminderToast] = useState(null);
  const queryClient = useQueryClient();
  const [tasksQuery, habitsQuery, reflectionQuery, weeklyQuery, remindersQuery] = useQueries({
    queries: [
      { queryKey: ["tasks", "today"], queryFn: () => getTodayTasks() },
      { queryKey: ["habits", "active"], queryFn: () => getHabits() },
      { queryKey: ["reflection", "today"], queryFn: () => getTodayReflection() },
      { queryKey: ["analytics", "weekly"], queryFn: () => getWeeklyAnalytics() },
      {
        queryKey: ["reminders", "list"],
        queryFn: () => getReminders(),
        enabled: remindersReady,
        staleTime: 2 * 60_000,
      },
    ],
  });
  const tasks = tasksQuery.data ?? [];
  const habits = habitsQuery.data ?? [];
  const reflection = reflectionQuery.data ?? null;
  const weekly = weeklyQuery.data ?? null;
  const reminders = remindersQuery.data ?? [];
  const loading =
    tasksQuery.isLoading ||
    habitsQuery.isLoading ||
    reflectionQuery.isLoading ||
    weeklyQuery.isLoading;
  const summaryError = weeklyQuery.isError ? "Summary couldn't load right now." : null;
  const habitsError = habitsQuery.isError ? "Habits couldn't load right now." : null;
  const tasksError = tasksQuery.isError ? "Tasks couldn't load right now." : null;
  const reflectionError = reflectionQuery.isError ? "Reflection couldn't load right now." : null;
  const remindersError = remindersQuery.isError ? "Reminders couldn't load right now." : null;
  const reload = useCallback(
    () =>
      Promise.all([
        tasksQuery.refetch(),
        habitsQuery.refetch(),
        reflectionQuery.refetch(),
        weeklyQuery.refetch(),
        remindersReady ? remindersQuery.refetch() : Promise.resolve(remindersQuery),
      ]),
    [habitsQuery, reflectionQuery, remindersQuery, remindersReady, tasksQuery, weeklyQuery]
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setRemindersReady(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onRemindersChanged = () => {
      if (remindersReady) remindersQuery.refetch();
    };
    window.addEventListener("lifeos-reminders-changed", onRemindersChanged);
    return () => window.removeEventListener("lifeos-reminders-changed", onRemindersChanged);
  }, [remindersQuery, remindersReady]);

  useEffect(() => {
    if (!reminderToast) return;
    const t = setTimeout(() => setReminderToast(null), 2200);
    return () => clearTimeout(t);
  }, [reminderToast]);

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

  const reminderEntityMap = useMemo(() => {
    const taskMap = new Map();
    const habitMap = new Map();

    for (const task of Array.isArray(tasks) ? tasks : []) {
      taskMap.set(Number(task.id), task);
    }
    for (const habit of Array.isArray(habits) ? habits : []) {
      habitMap.set(Number(habit.id), habit);
    }

    return { taskMap, habitMap };
  }, [habits, tasks]);

  const todayReminderGroups = useMemo(() => {
    const dueNow = [];
    const laterToday = [];
    const now = Date.now();
    const todayKey = new Date().toDateString();

    for (const reminder of Array.isArray(reminders) ? reminders : []) {
      if (Number(reminder?.enabled) === 0) continue;

      const rawWhen = reminder?.next_run_at ?? reminder?.due_at;
      if (!rawWhen) continue;

      const when = new Date(rawWhen);
      if (Number.isNaN(when.getTime())) continue;
      if (when.toDateString() !== todayKey) continue;

      const enriched = enrichReminder(reminder, reminderEntityMap);
      const datedReminder = {
        ...enriched,
        when,
      };

      if (when.getTime() <= now) dueNow.push(datedReminder);
      else laterToday.push(datedReminder);
    }

    dueNow.sort((a, b) => a.when.getTime() - b.when.getTime());
    laterToday.sort((a, b) => a.when.getTime() - b.when.getTime());
    return { dueNow, laterToday };
  }, [reminderEntityMap, reminders]);

  const remindersTodayCount = todayReminderGroups.dueNow.length + todayReminderGroups.laterToday.length;
  const notificationStatusLabel =
    notificationPermission === "granted"
      ? "Notifications on"
      : notificationPermission === "denied"
      ? "Notifications blocked"
      : "Notifications not set";
  const notificationStatusTone =
    notificationPermission === "granted"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : notificationPermission === "denied"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-stone-200 bg-stone-50 text-stone-700";

  async function handleReminderToggle(reminder) {
    try {
      setReminderActionId(reminder.id);
      const next = await updateReminder(reminder.id, {
        enabled: Number(reminder.enabled) === 0,
      });
      queryClient.setQueryData(["reminders", "list"], (current = []) =>
        current.map((item) => (item.id === next.id ? next : item))
      );
      notifyRemindersChanged();
      setReminderToast(
        Number(reminder.enabled) === 0 ? "Reminder resumed." : "Reminder paused."
      );
    } catch {
      setReminderToast("Couldn’t update reminder.");
    } finally {
      setReminderActionId(null);
    }
  }

  async function handleReminderTest(reminder) {
    try {
      setReminderActionId(reminder.id);
      await sendReminderNow(reminder.id);
      setReminderToast("Test reminder requested.");
    } catch {
      setReminderToast("Couldn’t send test reminder.");
    } finally {
      setReminderActionId(null);
    }
  }

  async function handleReminderDone(reminder) {
    try {
      setReminderActionId(reminder.id);
      const next = await handleReminderToday(reminder.id);
      queryClient.setQueryData(["reminders", "list"], (current = []) =>
        current.map((item) => (item.id === next.id ? next : item))
      );
      notifyRemindersChanged();
      setReminderToast("Handled for today.");
    } catch {
      setReminderToast("Couldn’t mark reminder handled.");
    } finally {
      setReminderActionId(null);
    }
  }

  // ✅ Replace plain text loader with your branded loader
  if (loading && !tasks.length && !habits.length && !reflection && !weekly && !reminders.length) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white/55 p-5 text-sm text-stone-600 shadow-sm backdrop-blur-md">
        Loading gently…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {reminderToast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2 text-xs text-emerald-800 shadow-sm backdrop-blur">
            {reminderToast}
          </div>
        </div>
      ) : null}

      {/* 🌿 Today Summary */}
      <GlassPanel
        title="Today"
        icon={Icons.dashboard}
        subtitle={`${tasks.length} tasks • ${habits.length} habits`}
        rightSlot={
          <span className="inline-flex rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-stone-600">
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
            <div className="text-[11px] text-stone-500">Reminders today</div>
            <div className="mt-1 text-sm font-semibold text-stone-900">
              {remindersTodayCount}
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

      <GlassPanel
        title="Gentle Reminders"
        icon={Icons.manifestations}
        subtitle="What needs a nudge today, without making the day feel noisy."
        rightSlot={
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap",
                notificationStatusTone,
              ].join(" ")}
            >
              {notificationStatusLabel}
            </span>
            <Link
              to="/settings"
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 whitespace-nowrap"
            >
              Manage notifications
            </Link>
            <Link
              to="/reminders"
              className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 whitespace-nowrap"
            >
              View all
            </Link>
          </div>
        }
      >
        {!remindersReady || (remindersQuery.isLoading && remindersTodayCount === 0) ? (
          <LoadingCard lines={4} />
        ) : remindersError ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {remindersError}
          </div>
        ) : remindersTodayCount === 0 ? (
          <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
            Nothing is scheduled to nudge you today. Quiet is allowed too.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Due now
                </div>
                <span className="rounded-full border border-amber-200 bg-white/70 px-2 py-0.5 text-[10px] text-amber-900">
                  {todayReminderGroups.dueNow.length}
                </span>
              </div>

              {todayReminderGroups.dueNow.length === 0 ? (
                <div className="rounded-2xl bg-white/60 p-3 text-sm text-stone-600">
                  Nothing due right this moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {todayReminderGroups.dueNow.map((reminder) => (
                    <ReminderActionCard
                      key={reminder.id}
                      reminder={reminder}
                      busy={reminderActionId === reminder.id}
                      tone="amber"
                      onHandledToday={handleReminderDone}
                      onToggleEnabled={handleReminderToggle}
                      onTestNow={handleReminderTest}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-sky-900">
                  Later today
                </div>
                <span className="rounded-full border border-sky-200 bg-white/70 px-2 py-0.5 text-[10px] text-sky-900">
                  {todayReminderGroups.laterToday.length}
                </span>
              </div>

              {todayReminderGroups.laterToday.length === 0 ? (
                <div className="rounded-2xl bg-white/60 p-3 text-sm text-stone-600">
                  The rest of the day is quiet for now.
                </div>
              ) : (
                <div className="space-y-2">
                  {todayReminderGroups.laterToday.map((reminder) => (
                    <ReminderActionCard
                      key={reminder.id}
                      reminder={reminder}
                      busy={reminderActionId === reminder.id}
                      tone="sky"
                      onHandledToday={handleReminderDone}
                      onToggleEnabled={handleReminderToggle}
                      onTestNow={handleReminderTest}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* 🌱 Habits */}
      <GlassPanel title="Habits" icon={Icons.habits} subtitle="Small check-ins, steady progress.">
        {habitsQuery.isLoading && habits.length === 0 ? (
          <LoadingCard lines={5} />
        ) : habitsError ? (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {habitsError}
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
            No habits yet. Start with one tiny daily ritual.
          </div>
        ) : (
          <>
            <HabitList habits={habits} onCheckedIn={reload} compact />
            {habits.length > 4 ? (
              <div className="mt-3 text-right">
                <a
                  href="/habits"
                  className="inline-flex text-sm text-emerald-900 underline underline-offset-4"
                >
                  View all habits →
                </a>
              </div>
            ) : null}
          </>
        )}
      </GlassPanel>

      {/* 📋 Tasks */}
      <GlassPanel title="Tasks" icon={Icons.tasks} subtitle="One clear next step is enough.">
        {tasksError && (
          <div className="mb-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
            {tasksError}
          </div>
        )}

        <TaskComposer
          onCreated={() => reload()}
        />

        <div className="mt-3">
          {tasksQuery.isLoading && topTasks.length === 0 ? (
            <LoadingCard lines={4} />
          ) : topTasks.length === 0 ? (
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
              className="inline-flex text-sm text-emerald-900 underline underline-offset-4"
            >
              View all tasks →
            </a>
          </div>
        )}
      </GlassPanel>

      {/* 🌸 Reflection */}
      <GlassPanel
        title="Reflection"
        icon={Icons.reflections}
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

        {reflectionQuery.isLoading && !reflection ? (
          <LoadingCard lines={5} />
        ) : !reflectionOpen && reflectionLogged ? (
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
