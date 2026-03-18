import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { apiFetch } from "../../shared/api/http";
import NotificationsCard from "../notifications/NotificationsCard";
import { archiveProject, createProject, deleteAllProjects, listProjects } from "../projects/projects.api";
import { createTask, deleteAllTasks } from "../tasks/tasks.api";
import { checkinHabit, createHabit, deleteAllHabits, listHabitCheckinsForExport } from "../habits/habits.api";
import { deleteAllReflections, upsertReflectionByDate } from "../reflections/reflections.api";
import { createReminder, deleteAllReminders, listReminders, notifyRemindersChanged } from "../reminders/reminders.api";
import {
  applyUiPreferences,
  loadUiPreferences,
  saveUiPreferences,
} from "../../shared/ui/uiPreferences";
import { Icons } from "../../config/icons";

function GlassPanel({ title, subtitle, children, icon: Icon }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="px-5 pt-5">
        <div>
          <div className="flex items-center gap-2">
            {Icon ? <Icon size={18} strokeWidth={1.75} className="text-inherit opacity-85" /> : null}
            <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          </div>
          {subtitle ? <p className="mt-1 text-sm text-stone-600">{subtitle}</p> : null}
        </div>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function SectionMeta({ tone = "neutral", text }) {
  const toneClass =
    tone === "account"
      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
      : tone === "local"
      ? "border-violet-200 bg-violet-50/70 text-violet-900"
      : "border-black/10 bg-white/80 text-stone-700";

  return <span className={`rounded-full border px-3 py-1 text-[11px] ${toneClass}`}>{text}</span>;
}

const themeOptions = [
  { id: "calm", label: "Calm", icon: Icons.themeCalm },
  { id: "warm", label: "Warm", icon: Icons.themeWarm },
  { id: "focus", label: "Focus", icon: Icons.themeFocus },
  { id: "pink", label: "Love", icon: Icons.themeLove },
  { id: "purple", label: "Dream", icon: Icons.themeDream },
];

const settingsSections = [
  {
    id: "account",
    title: "Account",
    blurb: "Name, email, and timezone",
    icon: Icons.settings,
  },
  {
    id: "appearance",
    title: "Appearance",
    blurb: "Theme and density",
    icon: Icons.manifestations,
  },
  {
    id: "delivery",
    title: "Reminders & Delivery",
    blurb: "Schedules, push, and quiet controls",
    icon: Icons.reminders,
  },
  {
    id: "data",
    title: "Data & Recovery",
    blurb: "Backups and safety",
    icon: Icons.analytics,
  },
];

function getTimezones() {
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      const tz = Intl.supportedValuesOf("timeZone");
      if (Array.isArray(tz) && tz.length > 0) return tz;
    } catch {
      // fallback below
    }
  }
  return [
    "Asia/Manila",
    "Asia/Singapore",
    "Asia/Tokyo",
    "America/Los_Angeles",
    "America/New_York",
    "Europe/London",
    "UTC",
  ];
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadNotificationPreferenceSnapshot() {
  return {
    reminders_enabled: localStorage.getItem("lifeos_pref_reminders") === "1",
    habit_nudges_enabled: localStorage.getItem("lifeos_pref_habit_nudges") === "1",
    weekly_recap_enabled: localStorage.getItem("lifeos_pref_weekly_recap") === "1",
  };
}

function syncNotificationPrefsToLocalStorage({
  reminders_enabled,
  habit_nudges_enabled,
  weekly_recap_enabled,
}) {
  if (reminders_enabled != null) {
    localStorage.setItem("lifeos_pref_reminders", reminders_enabled ? "1" : "0");
  }
  if (habit_nudges_enabled != null) {
    localStorage.setItem("lifeos_pref_habit_nudges", habit_nudges_enabled ? "1" : "0");
  }
  if (weekly_recap_enabled != null) {
    localStorage.setItem("lifeos_pref_weekly_recap", weekly_recap_enabled ? "1" : "0");
  }
}

function applyImportedPreferences(preferences) {
  if (!preferences || typeof preferences !== "object") return;

  const notifications = preferences.notifications;
  if (notifications && typeof notifications === "object") {
    if (notifications.reminders_enabled != null) {
      localStorage.setItem("lifeos_pref_reminders", notifications.reminders_enabled ? "1" : "0");
    }
    if (notifications.habit_nudges_enabled != null) {
      localStorage.setItem("lifeos_pref_habit_nudges", notifications.habit_nudges_enabled ? "1" : "0");
    }
    if (notifications.weekly_recap_enabled != null) {
      localStorage.setItem("lifeos_pref_weekly_recap", notifications.weekly_recap_enabled ? "1" : "0");
    }
  }

  const ui = preferences.ui;
  if (ui && typeof ui === "object") {
    saveUiPreferences({
      themeMood: ui.themeMood,
      density: ui.density,
    });
    applyUiPreferences({
      themeMood: ui.themeMood,
      density: ui.density,
    });
  }
}

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [toast, setToast] = useState(null); // { text, tone: "ok" | "warn" }
  const toastTimerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const importInputRef = useRef(null);

  const timezoneOptions = useMemo(() => getTimezones(), []);
  const [name, setName] = useState(user?.name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "Asia/Manila");

  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [habitNudgesEnabled, setHabitNudgesEnabled] = useState(true);
  const [weeklyRecapEnabled, setWeeklyRecapEnabled] = useState(true);
  const [themeMood, setThemeMood] = useState(() => loadUiPreferences().themeMood);
  const [density, setDensity] = useState(() => loadUiPreferences().density);

  useEffect(() => {
    setName(user?.name || "");
    setTimezone(user?.timezone || "Asia/Manila");
  }, [user?.name, user?.timezone]);

  useEffect(() => {
    if (user) {
      const next = {
        reminders_enabled: Number(user?.reminders_enabled ?? 1) !== 0,
        habit_nudges_enabled: Number(user?.habit_nudges_enabled ?? 1) !== 0,
        weekly_recap_enabled: Number(user?.weekly_recap_enabled ?? 1) !== 0,
      };
      setRemindersEnabled(next.reminders_enabled);
      setHabitNudgesEnabled(next.habit_nudges_enabled);
      setWeeklyRecapEnabled(next.weekly_recap_enabled);
      syncNotificationPrefsToLocalStorage(next);
      return;
    }

    const r = localStorage.getItem("lifeos_pref_reminders");
    const h = localStorage.getItem("lifeos_pref_habit_nudges");
    const w = localStorage.getItem("lifeos_pref_weekly_recap");
    if (r != null) setRemindersEnabled(r === "1");
    if (h != null) setHabitNudgesEnabled(h === "1");
    if (w != null) setWeeklyRecapEnabled(w === "1");
  }, [user]);

  useEffect(() => {
    applyUiPreferences({ themeMood, density });
  }, [themeMood, density]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast(text, tone = "ok") {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ text, tone });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3200);
  }

  async function saveProfilePrefs(e) {
    e.preventDefault();
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      showToast("Name is required.", "warn");
      return;
    }

    try {
      setBusy(true);
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: cleanName,
          timezone,
        }),
      });
      await refresh?.();
      showToast("Changes saved ✨", "ok");
    } catch {
      showToast("Could not update profile. Please retry.", "warn");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotificationPrefs(e) {
    e.preventDefault();
    const nextPrefs = {
      reminders_enabled: remindersEnabled,
      habit_nudges_enabled: habitNudgesEnabled,
      weekly_recap_enabled: weeklyRecapEnabled,
    };

    try {
      setBusy(true);
      const result = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify(nextPrefs),
      });
      syncNotificationPrefsToLocalStorage(nextPrefs);
      await refresh?.();
      showToast("Notification preferences saved across your account.", "ok");
      return result;
    } catch {
      showToast("Could not save notification preferences. Please retry.", "warn");
    } finally {
      setBusy(false);
    }
  }

  function savePersonalizationPrefs(e) {
    e.preventDefault();
    saveUiPreferences({ themeMood, density });
    showToast("Changes saved ✨", "ok");
  }

  function chooseThemeMood(nextThemeMood) {
    setThemeMood(nextThemeMood);
    saveUiPreferences({ themeMood: nextThemeMood, density });
  }

  function chooseDensity(nextDensity) {
    setDensity(nextDensity);
    saveUiPreferences({ themeMood, density: nextDensity });
  }

  async function exportMyData() {
    try {
      setBusy(true);
      const [projectsRes, tasksRes, habitsRes, habitCheckinsRes, reflectionsRes, remindersRes, meRes] = await Promise.all([
        listProjects({ includeArchived: true }).catch(() => []),
        apiFetch("/api/tasks?includeDone=true").catch(() => ({ tasks: [] })),
        apiFetch("/api/habits?includeInactive=true").catch(() => ({ habits: [] })),
        listHabitCheckinsForExport().catch(() => []),
        apiFetch("/api/reflections?limit=400&offset=0").catch(() => ({ reflections: [] })),
        listReminders().catch(() => []),
        apiFetch("/api/auth/me").catch(() => ({ user: null })),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        export_version: 3,
        backup_format: "lifeos",
        sections: [
          "profile",
          "preferences",
          "projects",
          "tasks",
          "habits",
          "habit_checkins",
          "reflections",
          "reminders",
        ],
        profile: meRes?.user ?? null,
        preferences: {
          notifications: loadNotificationPreferenceSnapshot(),
          ui: loadUiPreferences(),
        },
        projects: Array.isArray(projectsRes) ? projectsRes : [],
        tasks: tasksRes?.tasks ?? tasksRes ?? [],
        habits: habitsRes?.habits ?? habitsRes ?? [],
        habit_checkins: Array.isArray(habitCheckinsRes) ? habitCheckinsRes : [],
        reflections: reflectionsRes?.reflections ?? reflectionsRes ?? [],
        reminders: Array.isArray(remindersRes) ? remindersRes : [],
      };

      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`lifeos-export-${stamp}.json`, payload);
      showToast(
        `Export complete: ${(payload.projects || []).length} projects, ${(payload.tasks || []).length} tasks, ${(payload.habits || []).length} habits, ${(payload.habit_checkins || []).length} check-ins, ${(payload.reflections || []).length} reflections, ${(payload.reminders || []).length} reminders.`,
        "ok"
      );
    } catch {
      showToast("Data export failed. Please retry.", "warn");
    } finally {
      setBusy(false);
    }
  }

  function requestDeleteAccount() {
    showToast("Account deletion endpoint is not enabled yet. Contact support to proceed.", "warn");
  }

  async function importMyData(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);

      const raw = await file.text();
      const payload = JSON.parse(raw);

      const projects = Array.isArray(payload?.projects) ? payload.projects : [];
      const tasks = Array.isArray(payload?.tasks) ? payload.tasks : [];
      const habits = Array.isArray(payload?.habits) ? payload.habits : [];
      const habitCheckins = Array.isArray(payload?.habit_checkins) ? payload.habit_checkins : [];
      const reflections = Array.isArray(payload?.reflections) ? payload.reflections : [];
      const reminders = Array.isArray(payload?.reminders) ? payload.reminders : [];
      const profile = payload?.profile && typeof payload.profile === "object" ? payload.profile : null;
      const preferences = payload?.preferences && typeof payload.preferences === "object" ? payload.preferences : null;

      const confirmed = window.confirm(
        [
          "Replace your existing LifeOS data with this import?",
          "",
          "This will permanently delete your current projects, tasks, habits, reflections, and reminders before restoring the JSON file.",
          "Profile details, local preferences, and supported backup sections will also be updated from the file when present.",
        ].join("\n")
      );

      if (!confirmed) return;

      await Promise.all([
        deleteAllProjects(),
        deleteAllTasks(),
        deleteAllHabits(),
        deleteAllReflections(),
        deleteAllReminders(),
      ]);

      if (profile?.name || profile?.timezone) {
        await apiFetch("/api/auth/profile", {
          method: "PATCH",
          body: JSON.stringify({
            ...(profile?.name ? { name: String(profile.name).trim() } : {}),
            ...(profile?.timezone ? { timezone: String(profile.timezone).trim() } : {}),
          }),
        }).catch(() => null);
      }

      applyImportedPreferences(preferences);

      const nextUiPrefs = loadUiPreferences();
      setThemeMood(nextUiPrefs.themeMood);
      setDensity(nextUiPrefs.density);
      setRemindersEnabled(localStorage.getItem("lifeos_pref_reminders") === "1");
      setHabitNudgesEnabled(localStorage.getItem("lifeos_pref_habit_nudges") === "1");
      setWeeklyRecapEnabled(localStorage.getItem("lifeos_pref_weekly_recap") === "1");

      let importedProjects = 0;
      const projectIdMap = new Map();
      for (const project of projects) {
        const name = String(project?.name || "").trim();
        if (!name) continue;

        const createdProject = await createProject({
          name,
          description: project?.description ?? null,
          color: project?.color ?? null,
          sort_order: Number(project?.sort_order ?? 0) || 0,
        });

        if (createdProject?.id != null && project?.id != null) {
          projectIdMap.set(Number(project.id), Number(createdProject.id));
        }
        if (createdProject?.id != null && project?.archived_at) {
          await archiveProject(createdProject.id).catch(() => null);
        }
        importedProjects++;
      }

      let importedTasks = 0;
      const taskIdMap = new Map();
      for (const task of tasks) {
        const title = String(task?.title || "").trim();
        if (!title) continue;

        const createdTask = await createTask({
          title,
          notes: task?.notes ?? null,
          status: task?.status ?? "todo",
          priority: task?.priority ?? "medium",
          due_date: task?.due_date ? String(task.due_date).slice(0, 10) : null,
          sort_order: Number(task?.sort_order ?? 0) || 0,
          project_id:
            task?.project_id != null
              ? (projectIdMap.get(Number(task.project_id)) ?? null)
              : null,
        });
        if (createdTask?.id != null && task?.id != null) {
          taskIdMap.set(Number(task.id), Number(createdTask.id));
        }
        importedTasks++;
      }

      let importedHabits = 0;
      const habitIdMap = new Map();
      for (const habit of habits) {
        const name = String(habit?.name || "").trim();
        if (!name) continue;

        const createdHabit = await createHabit({
          name,
          description: habit?.description ?? null,
          active: Number(habit?.active ?? 1) !== 0,
          sort_order: Number(habit?.sort_order ?? 0) || 0,
          cadence: habit?.cadence ?? "daily",
          target_per_period: Math.max(1, Number(habit?.target_per_period ?? 1) || 1),
        });
        if (createdHabit?.id != null && habit?.id != null) {
          habitIdMap.set(Number(habit.id), Number(createdHabit.id));
        }
        importedHabits++;
      }

      let importedReflections = 0;
      for (const reflection of reflections) {
        const reflectDate = String(reflection?.reflect_date || "").slice(0, 10);
        if (!reflectDate) continue;

        await upsertReflectionByDate(reflectDate, {
          mood: reflection?.mood ?? null,
          gratitude: reflection?.gratitude ?? null,
          highlights: reflection?.highlights ?? null,
          challenges: reflection?.challenges ?? null,
          notes: reflection?.notes ?? null,
        });
        importedReflections++;
      }

      let importedCheckins = 0;
      for (const checkin of habitCheckins) {
        const originalHabitId = Number(checkin?.habit_id);
        const mappedHabitId = habitIdMap.get(originalHabitId);
        const checkinDate = String(checkin?.checkin_date || "").slice(0, 10);
        const value = Math.max(1, Number(checkin?.value ?? 1) || 1);

        if (!mappedHabitId || !checkinDate) continue;

        await checkinHabit(mappedHabitId, {
          checkin_date: checkinDate,
          value,
        });
        importedCheckins++;
      }

      let importedReminders = 0;
      for (const reminder of reminders) {
        const entityType = reminder?.entity_type === "habit" ? "habit" : reminder?.entity_type === "task" ? "task" : null;
        if (!entityType) continue;

        const originalEntityId = Number(reminder?.entity_id);
        const mappedEntityId =
          entityType === "task" ? taskIdMap.get(originalEntityId) : habitIdMap.get(originalEntityId);

        if (!mappedEntityId) continue;

        const timeOfDay = reminder?.time_of_day ? String(reminder.time_of_day).slice(0, 5) : null;
        const dueAt = reminder?.due_at ? new Date(reminder.due_at).toISOString() : null;
        const daysOfWeek = typeof reminder?.days_of_week === "string"
          ? reminder.days_of_week.split(",").map((day) => String(day).trim()).filter(Boolean)
          : Array.isArray(reminder?.days_of_week)
            ? reminder.days_of_week
            : null;

        const hasSchedule = Boolean(dueAt || timeOfDay || reminder?.cron_expr);
        if (!hasSchedule) continue;

        await createReminder({
          entity_type: entityType,
          entity_id: mappedEntityId,
          enabled: Number(reminder?.enabled ?? 1) !== 0,
          schedule_type: reminder?.schedule_type ?? (dueAt ? "daily" : "daily"),
          due_at: dueAt,
          time_of_day: timeOfDay,
          days_of_week: daysOfWeek,
          cron_expr: reminder?.cron_expr ?? null,
          respect_quiet_hours: Number(reminder?.respect_quiet_hours ?? 1) !== 0,
        });
        importedReminders++;
      }

      await refresh?.();
      notifyRemindersChanged();

      showToast(
        `Import complete: ${importedProjects} projects, ${importedTasks} tasks, ${importedHabits} habits, ${importedCheckins} check-ins, ${importedReflections} reflections, ${importedReminders} reminders.`,
        "ok"
      );
    } catch (error) {
      const detail =
        error?.data?.error ||
        error?.message ||
        "Import failed. Please choose a valid LifeOS export JSON.";
      showToast(detail, "warn");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="fixed inset-x-0 bottom-5 z-[90] flex justify-center px-4 pointer-events-none">
          <div
            role="status"
            aria-live="polite"
            className={[
              "w-full max-w-md rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur text-center pointer-events-auto",
              toast.tone === "warn"
                ? "border-rose-200 bg-rose-50/95 text-rose-800"
                : "border-emerald-200 bg-emerald-50/95 text-emerald-800",
            ].join(" ")}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-black/5 bg-white/45 p-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-stone-900">Settings</div>
            <p className="mt-1 max-w-2xl text-sm text-stone-600">
              Everything important is grouped here so profile details, reminder delivery, appearance, and backups are easier to scan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-stone-700">
              Profile syncs to your account
            </span>
            <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-stone-700">
              Appearance stays on this device
            </span>
            <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-stone-700">
              Backup format v3
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:bg-white/85"
              >
                <div className="flex items-center gap-2 text-stone-900">
                  <Icon size={18} strokeWidth={1.75} className="opacity-85" />
                  <span className="text-sm font-medium">{section.title}</span>
                </div>
                <p className="mt-2 text-xs text-stone-500">{section.blurb}</p>
              </a>
            );
          })}
        </div>
      </section>

      <div id="account">
        <GlassPanel title="Account" subtitle="Keep your account context accurate and your timezone trustworthy." icon={Icons.settings}>
        <div className="mb-4 flex flex-wrap gap-2">
          <SectionMeta tone="account" text="Syncs across your account" />
          <SectionMeta text="Timezone shapes Today, reminders, and insights" />
        </div>
        <form onSubmit={saveProfilePrefs} className="grid gap-3 sm:grid-cols-2">
          <label className="rounded-2xl border border-black/5 bg-white/70 p-3">
            <div className="text-[11px] text-stone-500">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
              placeholder="Your name"
              maxLength={80}
            />
          </label>
          <div className="rounded-2xl border border-black/5 bg-white/70 p-3">
            <div className="text-[11px] text-stone-500">Email</div>
            <div className="mt-1 text-sm font-medium text-stone-900">{user?.email || "—"}</div>
          </div>

          <label className="sm:col-span-2 rounded-2xl border border-black/5 bg-white/70 p-3">
            <div className="text-[11px] text-stone-500">Timezone</div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {timezoneOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
        </GlassPanel>
      </div>

      <div id="appearance">
        <GlassPanel
        title="Appearance"
        subtitle="Tune your visual mood and spacing to fit how you work."
        icon={Icons.manifestations}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <SectionMeta tone="local" text="Applies only on this device" />
          <SectionMeta text="Preview updates live while you tweak" />
        </div>
        <form onSubmit={savePersonalizationPrefs} className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-3">
            <div className="text-[11px] text-stone-500">Theme mood</div>
            <div className="mt-2 inline-flex max-w-full overflow-x-auto rounded-full border border-black/10 bg-white/80 p-0.5 text-xs">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => chooseThemeMood(opt.id)}
                    className={[
                      "inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition [&_svg]:opacity-85",
                      themeMood === opt.id
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                        : "text-stone-600 hover:bg-stone-100",
                    ].join(" ")}
                  >
                    <Icon size={18} strokeWidth={1.75} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/70 p-3">
            <div className="text-[11px] text-stone-500">Density</div>
            <div className="mt-2 inline-flex max-w-full overflow-x-auto rounded-full border border-black/10 bg-white/80 p-0.5 text-xs">
              {[
                { id: "comfortable", label: "Comfortable" },
                { id: "compact", label: "Compact" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => chooseDensity(opt.id)}
                  className={[
                    "rounded-full px-3 py-1.5 transition",
                    density === opt.id
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "text-stone-600 hover:bg-stone-100",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-stone-500">Changes preview live and apply app-wide.</div>
            <button
              type="submit"
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-stone-50"
            >
              Save Appearance
            </button>
          </div>
        </form>
        </GlassPanel>
      </div>

      <div id="delivery">
        <GlassPanel
        title="Reminders & Delivery"
        subtitle="Reminder schedules live in Reminders. Notification delivery and local nudges live here."
        icon={Icons.reminders}
      >
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <SectionMeta text="Schedules: Tasks and habits" />
          <SectionMeta text="Delivery: Browser push" />
          <SectionMeta tone="account" text="Notification preferences sync with your account" />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 p-4">
          <div>
            <div className="text-sm font-medium text-stone-900">Reminder schedules</div>
            <div className="mt-1 text-xs text-stone-500">
              Create, edit, pause, and review upcoming reminders in one place.
            </div>
          </div>
          <Link
            to="/reminders"
            className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Open Reminders
          </Link>
        </div>

        <form onSubmit={saveNotificationPrefs} className="space-y-3">
          <label className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 p-3 text-sm">
            <span className="text-stone-800">Task reminders sync across devices</span>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 p-3 text-sm">
            <span className="text-stone-800">Habit nudges sync across devices</span>
            <input
              type="checkbox"
              checked={habitNudgesEnabled}
              onChange={(e) => setHabitNudgesEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 p-3 text-sm">
            <span className="text-stone-800">Weekly recap syncs across devices</span>
            <input
              type="checkbox"
              checked={weeklyRecapEnabled}
              onChange={(e) => setWeeklyRecapEnabled(e.target.checked)}
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-stone-50"
            >
              Save Synced Notification Preferences
            </button>
          </div>
        </form>

        <div className="mt-4">
          <NotificationsCard />
        </div>
        </GlassPanel>
      </div>

      <div id="data">
        <GlassPanel title="Data & Recovery" subtitle="Backups, restore, and account safety controls." icon={Icons.analytics}>
        <div className="mb-4 flex flex-wrap gap-2">
          <SectionMeta tone="account" text="Backups capture your synced account data" />
          <SectionMeta text="Appearance is included so restores still feel familiar" />
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <SectionMeta text="Includes projects, reminders, and habit history" />
          <SectionMeta text="Import replaces current data" />
          <SectionMeta text="JSON export version 3" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4">
            <div className="text-sm font-medium text-stone-900">Export my data</div>
            <div className="mt-1 text-xs text-stone-500">
              Download profile, preferences, projects, tasks, habits, habit history, reflections, and reminders as JSON.
            </div>
            <button
              type="button"
              onClick={exportMyData}
              disabled={busy}
              className="mt-3 rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-60"
            >
              {busy ? "Preparing export…" : "Download JSON Export"}
            </button>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/70 p-4">
            <div className="text-sm font-medium text-stone-900">Import my data</div>
            <div className="mt-1 text-xs text-stone-500">
              Restore profile, preferences, projects, tasks, habits, habit history, reflections, and reminders from a LifeOS export JSON.
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={importMyData}
              disabled={busy}
              className="mt-3 block w-full text-sm text-stone-700 file:mr-3 file:rounded-2xl file:border file:border-black/10 file:bg-white file:px-4 file:py-2 file:text-sm file:text-stone-700 hover:file:bg-stone-50 disabled:opacity-60"
            />
            <div className="mt-2 text-[11px] text-stone-500">
              Import replaces your current projects, tasks, habits, reflections, and reminders before restoring this file, then reapplies supported preferences and habit history.
            </div>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
            <div className="text-sm font-medium text-rose-900">Delete account</div>
            <div className="mt-1 text-xs text-rose-700">
              Permanently deleting your account is currently handled manually for safety.
            </div>
            <button
              type="button"
              onClick={requestDeleteAccount}
              className="mt-3 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm text-rose-800 hover:bg-rose-100"
            >
              Request Account Deletion
            </button>
          </div>
        </div>
        </GlassPanel>
      </div>
    </div>
  );
}
