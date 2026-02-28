import { useEffect, useMemo, useState } from "react";
import { checkinHabit } from "../habits.api";

function getTarget(h) {
  return Number(h?.target_per_period ?? h?.target ?? 1) || 1;
}

function getProgress(h) {
  if (Number.isFinite(Number(h?.progress))) return Number(h.progress);
  if (h?.thisPeriodProgress?.value != null) return Number(h.thisPeriodProgress.value) || 0;
  if (h?.checked_in_today === true) return 1;
  return 0;
}

function getCadenceLabel(h) {
  const cadence = (h?.cadence ?? h?.schedule_type ?? "").toString().toLowerCase();
  if (cadence.includes("week")) return "weekly";
  return "daily";
}

export default function HabitList({ habits, onCheckedIn }) {
  const [busyId, setBusyId] = useState(null);

  // --- Toast (tiny feedback) ---
  const [toast, setToast] = useState(null); // { message, tone }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
  }

  // --- Optional confirm modal (ready for future delete/reset) ---
  // You asked about the backdrop style — putting it here so you can reuse.
  const [confirm, setConfirm] = useState(null);
  function askConfirm(payload) {
    setConfirm(payload);
  }
  function closeConfirm() {
    setConfirm(null);
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

  async function handleCheckin(habitId) {
    try {
      setBusyId(habitId);
      await checkinHabit(habitId);
      await onCheckedIn?.(habitId);
      showToast("Check-in saved ✨", "ok");
    } catch (e) {
      showToast("Couldn’t check-in. Try again.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  if (!normalized.length) {
    return <div className="text-sm text-stone-500">No habits yet.</div>;
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

      {/* Confirm Modal (not used yet, but styled the way you want) */}
      {confirm ? (
        <div
          className={[
            "fixed inset-0 z-50 grid place-items-center p-4",
            // softer than black overlay: radial gradient + gentle tint
            "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.0)_0%,rgba(16,16,16,0.08)_55%,rgba(16,16,16,0.16)_100%)]",
          ].join(" ")}
        >
          <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white/85 p-4 shadow-lg backdrop-blur">
            <div className="text-sm font-semibold text-stone-900">{confirm.title}</div>
            <div className="mt-1 text-xs text-stone-600">{confirm.body}</div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirm.onYes}
                className={[
                  "rounded-xl border px-3 py-2 text-xs font-medium transition active:scale-[0.98]",
                  confirm.tone === "danger"
                    ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
                ].join(" ")}
              >
                {confirm.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Habits */}
      <div className="space-y-2">
        {normalized.map((h) => {
          const isBusy = busyId === h.id;

          const buttonLabel = h.done ? "Checked" : h.started ? "Add +1" : "Check in";

          return (
            <div
              key={h.id}
              className={[
                "flex items-center justify-between gap-3 rounded-2xl border p-3",
                "transition-transform duration-150 ease-out hover:-translate-y-[1px]",
                h.done
                  ? "border-emerald-200 bg-emerald-50/60"
                  : h.started
                  ? "border-emerald-100 bg-white/70"
                  : "border-black/5 bg-white/70",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className={[
                      "text-sm font-medium truncate",
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
                    <span className="shrink-0 text-[11px] text-emerald-800">logged</span>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-stone-500">
                  {h.cadence} • target {h.target} per period
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCheckin(h.id)}
                disabled={isBusy || h.done} // optional: disable when done
                className={[
                  "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition",
                  "disabled:opacity-60 active:scale-[0.98]",
                  h.done
                    ? "border-emerald-200 bg-white/70 text-emerald-900 cursor-default"
                    : "border-black/10 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
                ].join(" ")}
              >
                {isBusy ? "Checking…" : buttonLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
