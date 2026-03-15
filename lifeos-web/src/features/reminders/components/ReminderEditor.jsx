import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createReminder,
  deleteReminder,
  listReminders,
  notifyRemindersChanged,
  sendReminderNow,
  updateReminder,
} from "../reminders.api";

const DAY_OPTIONS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];

function emptyDraft() {
  return {
    mode: "daily",
    time_of_day: "09:00",
    once_at: "",
    days_of_week: ["mon", "wed", "fri"],
    enabled: true,
    respect_quiet_hours: true,
  };
}

function normalizeDays(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toLocalDateTimeInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function buildDraftFromReminder(reminder) {
  if (!reminder) return emptyDraft();

  if (reminder.due_at) {
    return {
      mode: "once",
      time_of_day: "09:00",
      once_at: toLocalDateTimeInput(reminder.due_at),
      days_of_week: normalizeDays(reminder.days_of_week),
      enabled: Number(reminder.enabled) !== 0,
      respect_quiet_hours: Number(reminder.respect_quiet_hours) !== 0,
    };
  }

  return {
    mode: reminder.schedule_type === "weekly" ? "weekly" : "daily",
    time_of_day: String(reminder.time_of_day ?? "09:00").slice(0, 5) || "09:00",
    once_at: "",
    days_of_week: normalizeDays(reminder.days_of_week),
    enabled: Number(reminder.enabled) !== 0,
    respect_quiet_hours: Number(reminder.respect_quiet_hours) !== 0,
  };
}

function buildPayloadFromDraft(entityType, entityId, draft) {
  const base = {
    entity_type: entityType,
    entity_id: entityId,
    enabled: draft.enabled,
    respect_quiet_hours: draft.respect_quiet_hours,
  };

  if (draft.mode === "once") {
    return {
      ...base,
      schedule_type: "daily",
      due_at: draft.once_at ? new Date(draft.once_at).toISOString() : null,
      time_of_day: null,
      days_of_week: null,
      cron_expr: null,
    };
  }

  return {
    ...base,
    schedule_type: draft.mode === "weekly" ? "weekly" : "daily",
    due_at: null,
    time_of_day: draft.time_of_day || "09:00",
    days_of_week: draft.mode === "weekly" ? draft.days_of_week : null,
    cron_expr: null,
  };
}

function formatNextRun(reminder) {
  const value = reminder?.next_run_at ?? reminder?.due_at;
  if (!value) return "No next run scheduled yet.";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Next run is set.";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusCounts(reminders) {
  const active = reminders.filter((item) => Number(item.enabled) !== 0).length;
  const paused = reminders.filter((item) => Number(item.enabled) === 0).length;
  return { active, paused, total: reminders.length };
}

export default function ReminderEditor({
  entityType,
  entityId,
  compact = false,
  title = "Reminder",
  autoOpen = false,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState("ok");
  const [reminders, setReminders] = useState([]);
  const [editingId, setEditingId] = useState("new");
  const [draft, setDraft] = useState(emptyDraft);

  const loadReminder = useCallback(async () => {
    setLoading(true);
    try {
      const allReminders = await listReminders();
      const matches = (Array.isArray(allReminders) ? allReminders : []).filter(
        (item) => item.entity_type === entityType && Number(item.entity_id) === Number(entityId)
      );
      setReminders(matches);
      setEditingId("new");
      setDraft(emptyDraft());
    } catch {
      setMessage("Couldn’t load reminder right now.");
      setTone("warn");
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType]);

  useEffect(() => {
    loadReminder();
  }, [loadReminder]);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(""), 2200);
    return () => clearTimeout(t);
  }, [message]);

  const activeReminder = useMemo(
    () => reminders.find((item) => String(item.id) === String(editingId)) ?? null,
    [editingId, reminders]
  );

  const summary = useMemo(() => {
    if (loading) return "Loading reminder…";
    if (!reminders.length) return "No reminder yet.";
    if (reminders.length === 1) {
      const reminder = reminders[0];
      if (reminder.due_at) return `One-time reminder: ${formatNextRun(reminder)}`;
      if (reminder.schedule_type === "weekly") {
        const days = normalizeDays(reminder.days_of_week).join(", ") || "selected days";
        return `Weekly at ${String(reminder.time_of_day ?? "").slice(0, 5)} on ${days}.`;
      }
      return `Daily at ${String(reminder.time_of_day ?? "").slice(0, 5)}.`;
    }
    return `${reminders.length} reminders saved.`;
  }, [loading, reminders]);

  const orderedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => {
      const an = a?.next_run_at ?? a?.due_at ?? "";
      const bn = b?.next_run_at ?? b?.due_at ?? "";
      return String(an).localeCompare(String(bn));
    });
  }, [reminders]);

  const counts = useMemo(() => statusCounts(reminders), [reminders]);

  function toggleDay(dayId) {
    setDraft((current) => {
      const days = new Set(current.days_of_week);
      if (days.has(dayId)) days.delete(dayId);
      else days.add(dayId);
      return { ...current, days_of_week: DAY_OPTIONS.map((day) => day.id).filter((id) => days.has(id)) };
    });
  }

  async function handleSave() {
    if (draft.mode === "once" && !draft.once_at) {
      setMessage("Choose a date and time first.");
      setTone("warn");
      return;
    }

    if ((draft.mode === "daily" || draft.mode === "weekly") && !draft.time_of_day) {
      setMessage("Choose a time first.");
      setTone("warn");
      return;
    }

    if (draft.mode === "weekly" && draft.days_of_week.length === 0) {
      setMessage("Pick at least one weekday.");
      setTone("warn");
      return;
    }

    try {
      setBusy(true);
      const payload = buildPayloadFromDraft(entityType, entityId, draft);
      const nextReminder = activeReminder
        ? await updateReminder(activeReminder.id, payload)
        : await createReminder(payload);
      const isUpdating = Boolean(activeReminder);
      setReminders((current) => {
        const next = current.filter((item) => item.id !== nextReminder.id);
        next.push(nextReminder);
        return next;
      });
      setEditingId("new");
      setDraft(emptyDraft());
      await loadReminder();
      notifyRemindersChanged();
      setMessage(isUpdating ? "Reminder updated." : "Reminder saved.");
      setTone("ok");
      setOpen(false);
    } catch (error) {
      setMessage(error?.data?.message || "Couldn’t save reminder.");
      setTone("warn");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!activeReminder) return;
    try {
      setBusy(true);
      await deleteReminder(activeReminder.id);
      setReminders((current) => current.filter((item) => item.id !== activeReminder.id));
      setEditingId("new");
      setDraft(emptyDraft());
      notifyRemindersChanged();
      setMessage("Reminder removed.");
      setTone("ok");
    } catch {
      setMessage("Couldn’t remove reminder.");
      setTone("warn");
    } finally {
      setBusy(false);
    }
  }

  async function handleSendNow() {
    if (!activeReminder) return;
    try {
      setBusy(true);
      await sendReminderNow(activeReminder.id);
      setMessage("Test reminder requested.");
      setTone("ok");
    } catch {
      setMessage("Couldn’t send test reminder.");
      setTone("warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "rounded-2xl border border-black/5 bg-white/55 p-3" : "rounded-2xl border border-black/5 bg-white/60 p-3"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-semibold text-stone-700">{title}</div>
            {!loading ? (
              <>
                <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] text-stone-700">
                  {counts.total} total
                </span>
                {counts.active ? (
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] text-sky-800">
                    {counts.active} active
                  </span>
                ) : null}
                {counts.paused ? (
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] text-stone-600">
                    {counts.paused} paused
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="mt-1 text-[11px] text-stone-500">{summary}</div>
          {reminders.length ? (
            <div className="mt-1 text-[11px] text-stone-500">
              {orderedReminders.length === 1
                ? Number(orderedReminders[0].enabled) === 0
                  ? "Currently paused."
                  : `Next: ${formatNextRun(orderedReminders[0])}`
                : `${orderedReminders.filter((item) => Number(item.enabled) !== 0).length} active`}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-[11px] text-stone-700 hover:bg-stone-50"
        >
          {open ? "Hide" : reminders.length ? "Manage" : "Add"}
        </button>
      </div>

      {message ? (
        <div
          className={[
            "mt-3 rounded-xl border px-3 py-2 text-[11px]",
            tone === "warn"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800",
          ].join(" ")}
        >
          {message}
        </div>
      ) : null}

      {open ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-black/5 bg-white/80 p-3">
          {orderedReminders.length ? (
            <div className="space-y-2">
              <div className="text-[11px] text-stone-500">Saved reminders</div>
              <div className="space-y-2">
                {orderedReminders.map((reminder) => {
                  const selected = String(editingId) === String(reminder.id);
                  const days = normalizeDays(reminder.days_of_week);
                  const label = reminder.due_at
                    ? `One time · ${formatNextRun(reminder)}`
                    : reminder.schedule_type === "weekly"
                    ? `Weekly · ${String(reminder.time_of_day ?? "").slice(0, 5)} · ${days.join(", ")}`
                    : `Daily · ${String(reminder.time_of_day ?? "").slice(0, 5)}`;

                  return (
                    <button
                      key={reminder.id}
                      type="button"
                      onClick={() => {
                        setEditingId(reminder.id);
                        setDraft(buildDraftFromReminder(reminder));
                      }}
                      className={[
                        "w-full rounded-2xl border px-3 py-2 text-left transition",
                        selected
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-black/10 bg-white hover:bg-stone-50",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-stone-800">{label}</div>
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[10px]",
                            Number(reminder.enabled) === 0
                              ? "border-stone-200 bg-stone-50 text-stone-600"
                              : "border-sky-200 bg-sky-50 text-sky-700",
                          ].join(" ")}
                        >
                          {Number(reminder.enabled) === 0 ? "Paused" : "Active"}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-stone-500">Next: {formatNextRun(reminder)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] text-stone-500">
              {activeReminder ? "Editing selected reminder" : "Create a new reminder"}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingId("new");
                setDraft(emptyDraft());
              }}
              className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-[11px] text-stone-700 hover:bg-stone-50"
            >
              New reminder
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
              { id: "once", label: "One time" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, mode: option.id }))}
                className={[
                  "rounded-xl border px-3 py-2 text-xs transition",
                  draft.mode === option.id
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-black/10 bg-white text-stone-700 hover:bg-stone-50",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>

          {draft.mode === "once" ? (
            <label className="block">
              <div className="text-[11px] text-stone-500">Date & time</div>
              <input
                type="datetime-local"
                value={draft.once_at}
                onChange={(e) => setDraft((current) => ({ ...current, once_at: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
              />
            </label>
          ) : (
            <label className="block">
              <div className="text-[11px] text-stone-500">Time</div>
              <input
                type="time"
                value={draft.time_of_day}
                onChange={(e) => setDraft((current) => ({ ...current, time_of_day: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
              />
            </label>
          )}

          {draft.mode === "weekly" ? (
            <div>
              <div className="text-[11px] text-stone-500">Days</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const active = draft.days_of_week.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={[
                        "rounded-full border px-2.5 py-1 text-[11px] transition",
                        active
                          ? "border-sky-200 bg-sky-50 text-sky-800"
                          : "border-black/10 bg-white text-stone-700 hover:bg-stone-50",
                      ].join(" ")}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft((current) => ({ ...current, enabled: e.target.checked }))}
              />
              Enabled
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-xs text-stone-700">
              <input
                type="checkbox"
                checked={draft.respect_quiet_hours}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, respect_quiet_hours: e.target.checked }))
                }
              />
              Respect quiet hours
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {activeReminder ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                >
                  Remove
                </button>
              ) : null}

              {activeReminder ? (
                <button
                  type="button"
                  onClick={handleSendNow}
                  disabled={busy}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                >
                  Test now
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={busy || loading}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
            >
              {busy ? "Saving…" : activeReminder ? "Save changes" : "Create reminder"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
