import { useEffect, useMemo, useState } from "react";
import { checkinHabit } from "../habits.api";
import Sparkle from "../../../shared/ui/Sparkle"; // adjust if your folders differ

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

export default function HabitList({ habits, onCheckedIn }) {
  const [busyId, setBusyId] = useState(null);

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

  // Sparkles (per habit card)
  const [sparkleId, setSparkleId] = useState(null);

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

      // feedback
      setSparkleId(habitId);
      setTimeout(() => setSparkleId(null), 950);
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

      <div className="space-y-2">
        {normalized.map((h) => {
          const isBusy = busyId === h.id;

          const buttonLabel = h.done ? "Checked" : h.started ? "Add +1" : "Check in";

          return (
            <div
              key={h.id}
              className={[
                "relative flex items-center justify-between gap-3 rounded-2xl border p-3",
                "transition-transform duration-150 ease-out hover:-translate-y-[1px]",
                h.done
                  ? "border-emerald-200 bg-emerald-50/60"
                  : h.started
                  ? "border-emerald-100 bg-white/70"
                  : "border-black/5 bg-white/70",
              ].join(" ")}
            >
              {/* Sparkles (only when this habit was checked-in) */}
              <Sparkle trigger={sparkleId === h.id} />

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
                    <span className="shrink-0 text-[11px] text-emerald-800">
                      logged
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 text-xs text-stone-500">
                  {h.cadence} • target {h.target} per period
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCheckin(h.id)}
                disabled={isBusy || h.done}
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
