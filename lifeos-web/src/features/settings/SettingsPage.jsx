import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../shared/auth/useAuth";
import { apiFetch } from "../../shared/api/http";
import NotificationsCard from "../notifications/NotificationsCard";
import {
  applyUiPreferences,
  loadUiPreferences,
  saveUiPreferences,
} from "../../shared/ui/uiPreferences";

function GlassPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="px-5 pt-5">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-stone-600">{subtitle}</p> : null}
        </div>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

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

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [toast, setToast] = useState(null); // { text, tone: "ok" | "warn" }
  const [busy, setBusy] = useState(false);

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
    const r = localStorage.getItem("lifeos_pref_reminders");
    const h = localStorage.getItem("lifeos_pref_habit_nudges");
    const w = localStorage.getItem("lifeos_pref_weekly_recap");
    if (r != null) setRemindersEnabled(r === "1");
    if (h != null) setHabitNudgesEnabled(h === "1");
    if (w != null) setWeeklyRecapEnabled(w === "1");
  }, []);

  useEffect(() => {
    applyUiPreferences({ themeMood, density });
  }, [themeMood, density]);

  function showToast(text, tone = "ok") {
    setToast({ text, tone });
    setTimeout(() => setToast(null), 2600);
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
      showToast("Profile updated.", "ok");
    } catch (e) {
      showToast("Could not update profile. Please retry.", "warn");
    } finally {
      setBusy(false);
    }
  }

  function saveNotificationPrefs(e) {
    e.preventDefault();
    localStorage.setItem("lifeos_pref_reminders", remindersEnabled ? "1" : "0");
    localStorage.setItem("lifeos_pref_habit_nudges", habitNudgesEnabled ? "1" : "0");
    localStorage.setItem("lifeos_pref_weekly_recap", weeklyRecapEnabled ? "1" : "0");
    showToast("Notification preferences saved.", "ok");
  }

  function savePersonalizationPrefs(e) {
    e.preventDefault();
    saveUiPreferences({ themeMood, density });
    showToast("Personalization saved.", "ok");
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
      const [tasksRes, habitsRes, reflectionsRes, meRes] = await Promise.all([
        apiFetch("/api/tasks?includeDone=true").catch(() => ({ tasks: [] })),
        apiFetch("/api/habits?includeInactive=true").catch(() => ({ habits: [] })),
        apiFetch("/api/reflections?limit=400&offset=0").catch(() => ({ reflections: [] })),
        apiFetch("/api/auth/me").catch(() => ({ user: null })),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        profile: meRes?.user ?? null,
        tasks: tasksRes?.tasks ?? tasksRes ?? [],
        habits: habitsRes?.habits ?? habitsRes ?? [],
        reflections: reflectionsRes?.reflections ?? reflectionsRes ?? [],
      };

      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`lifeos-export-${stamp}.json`, payload);
      showToast("Data export generated.", "ok");
    } catch {
      showToast("Data export failed. Please retry.", "warn");
    } finally {
      setBusy(false);
    }
  }

  function requestDeleteAccount() {
    showToast("Account deletion endpoint is not enabled yet. Contact support to proceed.", "warn");
  }

  return (
    <div className="space-y-8">
      {toast ? (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm">
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-xs shadow-lg backdrop-blur",
              toast.tone === "warn"
                ? "border-rose-200 bg-rose-50/95 text-rose-800"
                : "border-emerald-200 bg-emerald-50/95 text-emerald-800",
            ].join(" ")}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <GlassPanel title="Profile & Timezone" subtitle="Keep your account context accurate.">
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

      <GlassPanel
        title="Personalization"
        subtitle="Tune your visual mood and spacing to fit how you work."
      >
        <form onSubmit={savePersonalizationPrefs} className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-3">
            <div className="text-[11px] text-stone-500">Theme mood</div>
            <div className="mt-2 inline-flex max-w-full overflow-x-auto rounded-full border border-black/10 bg-white/80 p-0.5 text-xs">
              {[
                { id: "calm", label: "Calm" },
                { id: "warm", label: "Warm" },
                { id: "focus", label: "Focus" },
                { id: "pink", label: "Love" },
                { id: "purple", label: "Dream" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => chooseThemeMood(opt.id)}
                  className={[
                    "rounded-full px-3 py-1.5 transition",
                    themeMood === opt.id
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "text-stone-600 hover:bg-stone-100",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
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
              Save Personalization
            </button>
          </div>
        </form>
      </GlassPanel>

      <GlassPanel title="Notifications" subtitle="Choose what should gently reach you.">
        <form onSubmit={saveNotificationPrefs} className="space-y-3">
          <label className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 p-3 text-sm">
            <span className="text-stone-800">Task reminders</span>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 p-3 text-sm">
            <span className="text-stone-800">Habit nudges</span>
            <input
              type="checkbox"
              checked={habitNudgesEnabled}
              onChange={(e) => setHabitNudgesEnabled(e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/70 p-3 text-sm">
            <span className="text-stone-800">Weekly recap</span>
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
              Save Notification Preferences
            </button>
          </div>
        </form>

        <div className="mt-4">
          <NotificationsCard />
        </div>
      </GlassPanel>

      <GlassPanel title="Data & Safety" subtitle="Manage your data with clear controls.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4">
            <div className="text-sm font-medium text-stone-900">Export my data</div>
            <div className="mt-1 text-xs text-stone-500">
              Download tasks, habits, reflections, and profile as JSON.
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
  );
}
