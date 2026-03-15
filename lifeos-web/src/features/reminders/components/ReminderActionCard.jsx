import { Link } from "react-router-dom";
import { formatReminderWhen, summarizeReminderSchedule } from "../reminders.utils";

export default function ReminderActionCard({
  reminder,
  busy = false,
  tone = "sky",
  showDelete = false,
  onToggleEnabled,
  onHandledToday,
  onTestNow,
  onDelete,
}) {
  const cardTone =
    tone === "amber"
      ? "border-amber-100 bg-white/80"
      : tone === "stone"
      ? "border-black/10 bg-white/80"
      : "border-sky-100 bg-white/80";

  const statusClass =
    reminder.status === "due"
      ? "border-amber-200 bg-amber-50/70 text-amber-900"
      : reminder.status === "paused"
      ? "border-stone-200 bg-stone-50 text-stone-700"
      : "border-sky-200 bg-sky-50/70 text-sky-900";

  return (
    <div className={`rounded-2xl border p-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow ${cardTone}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-medium text-stone-900">{reminder.entityLabel}</div>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusClass}`}>
              {reminder.status === "due"
                ? "Due now"
                : reminder.status === "paused"
                ? "Paused"
                : "Scheduled"}
            </span>
            <span className="rounded-full border border-black/10 bg-white px-2 py-0.5 text-[10px] text-stone-600">
              {reminder.entity_type}
            </span>
          </div>

          <div className="mt-1 text-xs text-stone-500">{summarizeReminderSchedule(reminder)}</div>
          <div className="mt-1 text-xs text-stone-500">
            Next run: {formatReminderWhen(reminder.next_run_at ?? reminder.due_at)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            to={reminder.entityHref ?? reminder.href}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
          >
            Open
          </Link>
          {onToggleEnabled ? (
            <button
              type="button"
              onClick={() => onToggleEnabled(reminder)}
              disabled={busy}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              {Number(reminder.enabled) === 0 ? "Resume" : "Pause"}
            </button>
          ) : null}
          {onHandledToday ? (
            <button
              type="button"
              onClick={() => onHandledToday(reminder)}
              disabled={busy}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
            >
              {busy ? "Working…" : "Handled today"}
            </button>
          ) : null}
          {onTestNow ? (
            <button
              type="button"
              onClick={() => onTestNow(reminder)}
              disabled={busy}
              className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 hover:bg-sky-100 disabled:opacity-60"
            >
              {busy ? "Working…" : "Test now"}
            </button>
          ) : null}
          {showDelete && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(reminder)}
              disabled={busy}
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            >
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
