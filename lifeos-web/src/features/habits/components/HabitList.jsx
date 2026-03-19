import { useEffect, useMemo, useRef, useState } from "react";
import { checkinHabit } from "../habits.api";
import ReminderEditor from "../../reminders/components/ReminderEditor";

function getTarget(h) {
  return Number(h?.target_per_period ?? h?.target ?? 1) || 1;
}

function getProgress(h) {
  // direct progress field (your extended /api/habits)
  if (Number.isFinite(Number(h?.progress))) {
    return Number(h.progress);
  }

  // streak-style response
  if (h?.thisPeriodProgress?.value != null) {
    return Number(h.thisPeriodProgress.value) || 0;
  }

  // fallback boolean
  if (h?.checked_in_today === true) return 1;

  return 0;
}

function getCadenceLabel(h) {
  const cadence = (h?.cadence ?? h?.schedule_type ?? "").toString().toLowerCase();
  if (cadence.includes("week")) return "weekly";
  return "daily";
}

export default function HabitList({
  habits,
  onCheckedIn,
  highlightHabitId = null,
  autoOpenReminderForId = null,
  compact = false,
  focusHabitId = null,
  onToggleFocusHabit = null,
}) {
  const [busyId, setBusyId] = useState(null);
  const cardRefs = useRef(new Map());
  const [showCompleted, setShowCompleted] = useState(false);

  // Toast (gentle feedback)
  const [toast, setToast] = useState(null); // { message, tone }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
  }

  const normalized = useMemo(() => {
    const list = Array.isArray(habits) ? habits : [];
    return list.map((h) => {
      const target = getTarget(h);
      const progress = Math.min(getProgress(h), target);
      const done = progress >= target;
      const started = progress > 0;

      return {
        id: h.id,
        name: h.name ?? "Untitled habit",
        cadence: getCadenceLabel(h),
        target,
        progress,
        done,
        started,
      };
    });
  }, [habits]);

  const dueNow = useMemo(
    () => normalized.filter((h) => !h.done && !h.started),
    [normalized]
  );
  const inProgress = useMemo(
    () => normalized.filter((h) => !h.done && h.started),
    [normalized]
  );
  const completed = useMemo(
    () => normalized.filter((h) => h.done),
    [normalized]
  );

  const normalizedFocusHabitId =
    focusHabitId == null ? null : String(focusHabitId);

  useEffect(() => {
    if (!highlightHabitId) return;
    const hid = String(highlightHabitId);
    const el = cardRefs.current.get(hid);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightHabitId, normalized]);

  async function handleCheckin(habitId) {
    try {
      setBusyId(habitId);
      await checkinHabit(habitId);
      await onCheckedIn?.(habitId);
      showToast("Check-in saved", "ok");
    } catch {
      showToast("Couldn’t check-in. Try again.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  if (!normalized.length) {
    return <div className="text-sm text-stone-500">No habits yet.</div>;
  }

  function SectionBlock({ title, tone = "stone", items }) {
    if (!items.length) return null;

    const tones = {
      amber: "text-amber-800 bg-amber-50 border-amber-200",
      sky: "text-sky-800 bg-sky-50 border-sky-200",
      emerald: "text-emerald-800 bg-emerald-50 border-emerald-200",
      stone: "text-stone-700 bg-white border-black/10",
    };

    return (
      <div className="space-y-2">
        <div
          className={[
            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
            tones[tone] || tones.stone,
          ].join(" ")}
        >
          {title} ({items.length})
        </div>
        <div className="space-y-2">{items.map((h) => renderHabitCard(h))}</div>
      </div>
    );
  }

  function renderHabitCard(h) {
    const isBusy = busyId === h.id;
    const buttonLabel = h.done ? "Checked" : h.started ? "Add +1" : "Check in";
    const pct = Math.round((h.progress / Math.max(1, h.target)) * 100);
    const isHighlighted = highlightHabitId != null && String(highlightHabitId) === String(h.id);
    const isFocused = normalizedFocusHabitId === String(h.id);
    const canPinToFocus = typeof onToggleFocusHabit === "function";

    return (
      <div
        key={h.id}
        ref={(node) => {
          const hid = String(h.id);
          if (!node) cardRefs.current.delete(hid);
          else cardRefs.current.set(hid, node);
        }}
        className={[
          "relative flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between",
          "transition-transform duration-150 ease-out hover:-translate-y-[1px]",
          isHighlighted ? "ring-2 ring-emerald-200 ring-offset-2 ring-offset-transparent" : "",
          h.done
            ? "border-emerald-200 bg-emerald-50/60"
            : h.started
            ? "border-sky-100 bg-sky-50/40"
            : "border-amber-100 bg-amber-50/30",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={[
                "min-w-0 flex-[999] text-sm font-medium break-words",
                h.done ? "text-emerald-950" : "text-stone-900",
              ].join(" ")}
            >
              {h.name}
            </div>

            <span
              className={[
                "shrink-0 text-xs rounded-xl border px-2 py-0.5",
                h.done
                  ? "border-emerald-200 bg-white/70 text-emerald-900"
                  : "border-black/10 bg-white text-stone-700",
              ].join(" ")}
              title="Progress this period"
            >
              {h.progress}/{h.target}
            </span>

            {h.started && !h.done ? (
              <span className="shrink-0 text-[11px] text-sky-800">in progress</span>
            ) : null}
          </div>

          <div className="mt-1 text-xs text-stone-500">
            {h.cadence} • target {h.target} per period
          </div>

          <div className="mt-2 h-1.5 w-full rounded-full border border-black/5 bg-white/80">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: h.done
                  ? "linear-gradient(90deg, #86EFAC, #4ADE80)"
                  : h.started
                  ? "linear-gradient(90deg, #7DD3FC, #A78BFA)"
                  : "linear-gradient(90deg, #FDE68A, #FCA5A5)",
              }}
            />
          </div>

          <div className="mt-3">
            <ReminderEditor
              entityType="habit"
              entityId={h.id}
              compact
              title="Gentle reminder"
              autoOpen={
                autoOpenReminderForId != null && String(autoOpenReminderForId) === String(h.id)
              }
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleCheckin(h.id)}
          disabled={isBusy || h.done}
          className={[
            "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition",
            "w-full sm:w-auto disabled:opacity-60 active:scale-[0.98]",
            h.done
              ? "border-emerald-200 bg-white/70 text-emerald-900 cursor-default"
              : "border-black/10 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
          ].join(" ")}
        >
          {isBusy ? "Checking…" : buttonLabel}
        </button>

        {canPinToFocus ? (
          <button
            type="button"
            onClick={() => onToggleFocusHabit(h.id)}
            className={[
              "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition",
              isFocused
                ? "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                : "border-black/10 bg-white/70 text-stone-700 hover:bg-stone-50",
            ].join(" ")}
          >
            {isFocused ? "Focused" : "Focus"}
          </button>
        ) : null}
      </div>
    );
  }

  function renderCompactHabitRow(h) {
    const isBusy = busyId === h.id;
    const isHighlighted = highlightHabitId != null && String(highlightHabitId) === String(h.id);
    const isFocused = normalizedFocusHabitId === String(h.id);
    const canPinToFocus = typeof onToggleFocusHabit === "function";
    const toneClass = h.done
      ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
      : h.started
      ? "border-sky-200 bg-sky-50/70 text-sky-900"
      : "border-stone-200 bg-white/80 text-stone-700";

    return (
      <div
        key={h.id}
        ref={(node) => {
          const hid = String(h.id);
          if (!node) cardRefs.current.delete(hid);
          else cardRefs.current.set(hid, node);
        }}
        className={[
          "flex items-center gap-3 rounded-2xl border px-3 py-2.5",
          isHighlighted ? "ring-2 ring-emerald-200 ring-offset-2 ring-offset-transparent" : "border-black/5",
          h.done ? "bg-emerald-50/60" : "bg-white/70",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className={["min-w-0 truncate text-sm font-medium", h.done ? "text-emerald-950" : "text-stone-900"].join(" ")}>
              {h.name}
            </div>
            <span className={["shrink-0 rounded-full border px-2 py-0.5 text-[10px]", toneClass].join(" ")}>
              {h.progress}/{h.target}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-stone-500">
            {h.done ? "done today" : h.started ? "in progress" : `${h.cadence} habit`}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canPinToFocus ? (
            <button
              type="button"
              onClick={() => onToggleFocusHabit(h.id)}
              className={[
                "rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm transition active:scale-[0.98]",
                isFocused
                  ? "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100"
                  : "border-black/10 bg-white/70 text-stone-700 hover:bg-stone-50",
              ].join(" ")}
            >
              {isFocused ? "Focused" : "Focus"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => handleCheckin(h.id)}
            disabled={isBusy || h.done}
            style={
              h.done
                ? undefined
                : {
                    backgroundImage:
                      "linear-gradient(135deg, var(--lifeos-bg-from), var(--lifeos-bg-via))",
                  }
            }
            className={[
              "rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-60",
              h.done
                ? "cursor-default border-emerald-200 bg-white/80 text-emerald-900"
                : "border-black/10 bg-white/70 text-stone-800 hover:bg-white/85",
            ].join(" ")}
          >
            {isBusy ? "Saving..." : h.done ? "Done" : h.started ? "+1" : "Check"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={[
              "rounded-2xl border px-4 py-2 text-xs shadow-sm backdrop-blur",
              "bg-white/80",
              toast.tone === "warn"
                ? "border-rose-200 text-rose-700"
                : "border-emerald-200 text-emerald-800",
            ].join(" ")}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {compact ? (
        <div className="space-y-3">
          {[...dueNow, ...inProgress].length === 0 ? (
            <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
              All clear for now.
            </div>
          ) : (
            <div className="space-y-2">
              {[...dueNow, ...inProgress].map((h) => renderCompactHabitRow(h))}
            </div>
          )}

          {completed.length > 0 ? (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="text-[11px] text-stone-500 underline underline-offset-4 hover:text-stone-700"
              >
                {showCompleted ? "Hide completed" : `Show completed (${completed.length})`}
              </button>

              {showCompleted ? (
                <div className="mt-2 space-y-2">
                  {completed.map((h) => renderCompactHabitRow(h))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <SectionBlock title="Due now" tone="amber" items={dueNow} />
          <SectionBlock title="In progress" tone="sky" items={inProgress} />
          <SectionBlock title="Completed" tone="emerald" items={completed} />
        </div>
      )}
    </div>
  );
}
