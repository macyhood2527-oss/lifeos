import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { apiFetch } from "../../shared/api/http";
import { createHabit } from "../habits/habits.api";
import { createTask } from "../tasks/tasks.api";
import NotificationsCard from "../notifications/NotificationsCard";
import { markOnboardingComplete } from "./onboarding.state";
import { Icons } from "../../config/icons";

const steps = [
  { id: 0, title: "Set Your Rhythm", subtitle: "A little context helps LifeOS feel personal." },
  { id: 1, title: "Start One Habit", subtitle: "Tiny routines are enough to begin." },
  { id: 2, title: "Add One Task", subtitle: "Then choose whether you want gentle nudges." },
];

function GlassPanel({ children }) {
  return (
    <div className="rounded-[28px] border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur-md">
      {children}
    </div>
  );
}

function getTimezones() {
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      const list = Intl.supportedValuesOf("timeZone");
      if (Array.isArray(list) && list.length > 0) return list;
    } catch {
      // fall through
    }
  }
  return ["Asia/Manila", "America/Los_Angeles", "America/New_York", "Europe/London", "UTC"];
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const timezoneOptions = useMemo(() => getTimezones(), []);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const [name, setName] = useState(user?.name || "");
  const [timezone, setTimezone] = useState(user?.timezone || "Asia/Manila");

  const [habitName, setHabitName] = useState("");
  const [habitCadence, setHabitCadence] = useState("daily");
  const [habitTarget, setHabitTarget] = useState(1);

  const [taskTitle, setTaskTitle] = useState("");

  async function saveProfileAndContinue() {
    const cleanName = String(name || "").trim();
    if (!cleanName) {
      setToast("Name is required before we continue.");
      return;
    }

    try {
      setBusy(true);
      await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName, timezone }),
      });
      await refresh?.();
      setStep(1);
      setToast("Profile set.");
    } catch {
      setToast("Couldn’t save your profile just yet.");
    } finally {
      setBusy(false);
    }
  }

  async function createFirstHabitAndContinue() {
    const cleanName = String(habitName || "").trim();
    if (!cleanName) {
      setStep(2);
      return;
    }

    try {
      setBusy(true);
      await createHabit({
        name: cleanName,
        cadence: habitCadence,
        target_per_period: Math.max(1, Number(habitTarget) || 1),
        active: true,
        sort_order: 0,
      });
      setStep(2);
      setToast("First habit added.");
    } catch {
      setToast("Couldn’t create that habit right now.");
    } finally {
      setBusy(false);
    }
  }

  async function finishSetup() {
    try {
      setBusy(true);
      const cleanTask = String(taskTitle || "").trim();
      if (cleanTask) {
        await createTask({ title: cleanTask });
      }
      if (user?.id) markOnboardingComplete(user.id);
      setToast(cleanTask ? "Setup complete. You’re ready to begin." : "Setup complete.");
      navigate("/", { replace: true });
    } catch {
      setToast("Couldn’t finish setup just yet.");
    } finally {
      setBusy(false);
    }
  }

  function skipToNext() {
    if (step < steps.length - 1) setStep((current) => current + 1);
    else finishSetup();
  }

  function skipAll() {
    if (user?.id) markOnboardingComplete(user.id);
    navigate("/", { replace: true });
  }

  const StepIcon =
    step === 0 ? Icons.settings : step === 1 ? Icons.habits : Icons.tasks;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),rgba(242,247,244,0.95)_45%,rgba(237,242,248,1)_100%)] px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs text-stone-700 shadow-sm">
            <Icons.manifestations size={18} strokeWidth={1.75} />
            Welcome to LifeOS
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-stone-900">Let’s set up your gentle workspace</h1>
          <p className="mt-2 text-sm text-stone-600">
            This takes about a minute. We’ll set your timezone, add one habit, and add one task.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {steps.map((item) => (
            <div
              key={item.id}
              className={[
                "rounded-2xl border px-4 py-3 text-sm",
                item.id === step
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  : item.id < step
                  ? "border-sky-200 bg-sky-50/70 text-sky-900"
                  : "border-black/5 bg-white/70 text-stone-500",
              ].join(" ")}
            >
              <div className="text-[11px] uppercase tracking-wide">Step {item.id + 1}</div>
              <div className="mt-1 font-medium">{item.title}</div>
            </div>
          ))}
        </div>

        <GlassPanel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-stone-900">
                <StepIcon size={18} strokeWidth={1.75} />
                <h2 className="text-lg font-semibold">{steps[step].title}</h2>
              </div>
              <p className="mt-1 text-sm text-stone-600">{steps[step].subtitle}</p>
            </div>
            <button
              type="button"
              onClick={skipAll}
              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
            >
              Skip setup
            </button>
          </div>

          {toast ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
              {toast}
            </div>
          ) : null}

          <div className="mt-5">
            {step === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-2xl border border-black/5 bg-white/80 p-4">
                  <div className="text-[11px] text-stone-500">Name</div>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder="Your name"
                  />
                </label>

                <label className="rounded-2xl border border-black/5 bg-white/80 p-4">
                  <div className="text-[11px] text-stone-500">Timezone</div>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                  >
                    {timezoneOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-3 sm:grid-cols-12">
                <input
                  value={habitName}
                  onChange={(e) => setHabitName(e.target.value)}
                  placeholder="Drink water, stretch, read..."
                  className="sm:col-span-6 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
                <select
                  value={habitCadence}
                  onChange={(e) => setHabitCadence(e.target.value)}
                  className="sm:col-span-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={habitTarget}
                  onChange={(e) => setHabitTarget(e.target.value)}
                  className="sm:col-span-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                />
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                  <div className="text-[11px] text-stone-500">First task</div>
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="One clear next step for today..."
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div className="rounded-2xl border border-black/5 bg-white/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-stone-900">
                    <Icons.reminders size={18} strokeWidth={1.75} />
                    Notifications
                  </div>
                  <p className="mt-1 text-xs text-stone-500">
                    You can enable device notifications now, or manage them later in Settings.
                  </p>
                  <div className="mt-4">
                    <NotificationsCard />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-stone-500">
              Prefer to tweak things later? You can always change them in <Link to="/settings" className="underline">Settings</Link>.
            </div>
            <div className="flex flex-wrap gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  Back
                </button>
              ) : null}

              {step < 2 ? (
                <>
                  <button
                    type="button"
                    onClick={skipToNext}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={step === 0 ? saveProfileAndContinue : createFirstHabitAndContinue}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                  >
                    {busy ? "Saving…" : "Continue"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={finishSetup}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {busy ? "Finishing…" : "Finish setup"}
                </button>
              )}
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
