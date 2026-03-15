import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Section from "../../shared/ui/Section";
import HabitList from "./components/HabitList";
import { listHabits, createHabit, updateHabit, deleteHabit } from "./habits.api";
import { Icons } from "../../config/icons";

function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyHabitsState({ title, body, chips = [] }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(241,247,237,0.9))] p-5">
      <div className="text-sm font-medium text-stone-900">{title}</div>
      <p className="mt-1 text-sm text-stone-600">{body}</p>
      {chips.length ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-stone-700">
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function HabitsPage() {
  const [searchParams] = useSearchParams();
  const focusedHabitId = searchParams.get("item");
  const openReminder = searchParams.get("reminder") === "1";

  // Manage UI
  const [includeInactive, setIncludeInactive] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // Add form
  const [name, setName] = useState("");
  const [cadence, setCadence] = useState("daily"); // daily | weekly
  const [target, setTarget] = useState(1);

  // Inline edit
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({ name: "", cadence: "daily", target: 1 });

  // Toast (LifeOS soft feedback)
  const [toast, setToast] = useState(null); // { message, tone }
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
  }

  // Confirm modal (LifeOS themed)
  const [confirm, setConfirm] = useState(null);
  function askConfirm(payload) {
    setConfirm(payload);
  }
  function closeConfirm() {
    setConfirm(null);
  }

  const effectiveIncludeInactive = includeInactive || Boolean(focusedHabitId);
  const habitsQuery = useQuery({
    queryKey: ["habits", effectiveIncludeInactive ? "all" : "active"],
    queryFn: () => listHabits({ includeInactive: effectiveIncludeInactive }),
  });
  const habits = habitsQuery.data ?? [];
  const load = useCallback(() => habitsQuery.refetch(), [habitsQuery]);

  const activeHabits = useMemo(
    () => (Array.isArray(habits) ? habits : []).filter((h) => Number(h.active) === 1),
    [habits]
  );
  const visibleCheckinHabits = useMemo(() => {
    if (!focusedHabitId) return activeHabits;
    const focused = (Array.isArray(habits) ? habits : []).find(
      (habit) => String(habit.id) === String(focusedHabitId)
    );
    if (!focused) return activeHabits;
    if (activeHabits.some((habit) => String(habit.id) === String(focused.id))) return activeHabits;
    return [focused, ...activeHabits];
  }, [activeHabits, focusedHabitId, habits]);

  const activeHabitStats = useMemo(() => {
    function getTarget(h) {
      return Number(h?.target_per_period ?? h?.target ?? 1) || 1;
    }
    function getProgress(h) {
      if (Number.isFinite(Number(h?.progress))) return Number(h.progress);
      if (h?.thisPeriodProgress?.value != null) return Number(h.thisPeriodProgress.value) || 0;
      if (h?.checked_in_today === true) return 1;
      return 0;
    }

    const list = Array.isArray(activeHabits) ? activeHabits : [];
    const total = list.length;
    const dueNow = list.filter((h) => {
      const target = getTarget(h);
      const progress = Math.min(getProgress(h), target);
      return progress === 0;
    }).length;
    const inProgress = list.filter((h) => {
      const target = getTarget(h);
      const progress = Math.min(getProgress(h), target);
      return progress > 0 && progress < target;
    }).length;
    const completed = list.filter((h) => {
      const target = getTarget(h);
      const progress = Math.min(getProgress(h), target);
      return progress >= target;
    }).length;
    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, dueNow, inProgress, completed, completion };
  }, [activeHabits]);

  async function handleCreate(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;

    try {
      setBusyId("create");
      await createHabit({
        name: n,
        cadence,
        target_per_period: Math.max(1, Number(target) || 1),
        active: true,
        sort_order: 0,
      });

      setName("");
      setCadence("daily");
      setTarget(1);

      await load();
      showToast("Habit added 🌿", "ok");
    } catch {
      showToast("Couldn’t add habit. Try again.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(h) {
    setEditId(h.id);
    setDraft({
      name: h.name ?? "",
      cadence: h.cadence ?? "daily",
      target: Number(h.target_per_period ?? 1) || 1,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setDraft({ name: "", cadence: "daily", target: 1 });
  }

  async function saveEdit(habitId) {
    const n = (draft.name ?? "").trim();
    if (!n) return;

    try {
      setBusyId(habitId);
      await updateHabit(habitId, {
        name: n,
        cadence: draft.cadence,
        target_per_period: Math.max(1, Number(draft.target) || 1),
      });
      await load();
      cancelEdit();
      showToast("Changes saved", "ok");
    } catch {
      showToast("Save failed. Please retry.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  async function disableHabit(habitId) {
    askConfirm({
      title: "Disable this habit?",
      body: "You can show inactive habits anytime.",
      confirmText: "Disable",
      tone: "danger",
      onYes: async () => {
        try {
          setBusyId(habitId);
          await deleteHabit(habitId); // backend soft-disables (active=0)
          await load();
          showToast("Habit disabled", "ok");
        } catch {
          showToast("Disable failed. Try again.", "warn");
        } finally {
          setBusyId(null);
          closeConfirm();
        }
      },
    });
  }

  if (habitsQuery.isLoading) return <div className="text-stone-500">Loading…</div>;

  return (
    <div className="relative space-y-8">
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

      {/* Confirm Modal (soft gradient backdrop, LifeOS palette) */}
      {confirm ? (
        <div
          className={[
            "fixed inset-0 z-50 grid place-items-center p-4",
            "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.0)_0%,rgba(16,16,16,0.08)_55%,rgba(16,16,16,0.12)_100%)]",
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
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 hover:bg-rose-100 active:scale-[0.98]"
              >
                {confirm.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Manage */}
      <GlassPanel>
        <Section title="Habits" subtitle="Create, tweak, and keep your rhythms gentle." icon={Icons.habits}>
          {focusedHabitId ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              Focused from reminders. Inactive habits are shown too so the linked habit stays visible.
            </div>
          ) : null}

          {/* Top controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-stone-600">
              {activeHabits.length} active
              {includeInactive ? ` • ${(habits?.length ?? 0) - activeHabits.length} inactive` : ""}
            </div>

            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Show inactive
            </label>
          </div>

          {/* Add habit */}
          <form onSubmit={handleCreate} className="mt-4 grid gap-2 sm:grid-cols-12">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New habit name…"
              className="sm:col-span-6 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:bg-white"
            />

            <select
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
              className="sm:col-span-3 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
            </select>

            <input
              type="number"
              min={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="sm:col-span-1 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm"
              title="Target per period"
            />

            <button
              disabled={busyId === "create"}
              className="sm:col-span-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm hover:bg-white/85 active:scale-[0.99] disabled:opacity-60"
            >
              {busyId === "create" ? "Adding…" : "Add habit"}
            </button>

            <div className="sm:col-span-12 text-xs text-stone-500">
              Tip: daily targets can be &gt; 1 (ex: water 8). Weekly targets work well for “3x a week” habits.
            </div>
          </form>

          {/* Manage list */}
          <div className="mt-4 space-y-2">
            {(Array.isArray(habits) ? habits : []).length === 0 ? (
              <EmptyHabitsState
                title="Your habit space is still open and calm."
                body="Start with one anchor habit you can keep even on a low-energy day. The goal is consistency, not intensity."
                chips={["Drink water", "5-minute tidy", "Read one page"]}
              />
            ) : null}
            {(Array.isArray(habits) ? habits : []).map((h) => {
              const isEditing = editId === h.id;
              const isBusy = busyId === h.id;
              const isInactive = Number(h.active) === 0;

              return (
                <div
                  key={h.id}
                  className={[
                    "rounded-2xl border p-3 transition-transform duration-150 ease-out hover:-translate-y-[1px]",
                    isInactive
                      ? "border-black/5 bg-stone-50/60 opacity-75"
                      : "border-black/5 bg-white/70",
                  ].join(" ")}
                >
                  {!isEditing ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-stone-900 break-words">{h.name}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {h.cadence} • target {h.target_per_period} per period{" "}
                          {isInactive ? "• inactive" : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(h)}
                          className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-[0.98] sm:flex-none"
                        >
                          Edit
                        </button>

                        {!isInactive ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => disableHabit(h.id)}
                            className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-60 sm:flex-none"
                            title="Disable habit"
                          >
                            Disable
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-12">
                        <input
                          value={draft.name}
                          onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                          className="sm:col-span-6 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                        />

                        <select
                          value={draft.cadence}
                          onChange={(e) => setDraft((p) => ({ ...p, cadence: e.target.value }))}
                          className="sm:col-span-3 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                        >
                          <option value="daily">daily</option>
                          <option value="weekly">weekly</option>
                        </select>

                        <input
                          type="number"
                          min={1}
                          value={draft.target}
                          onChange={(e) => setDraft((p) => ({ ...p, target: e.target.value }))}
                          className="sm:col-span-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
                        />

                        <div className="sm:col-span-2 flex gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => saveEdit(h.id)}
                            className="w-full rounded-2xl border border-black/10 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 hover:bg-emerald-100 active:scale-[0.99] disabled:opacity-60"
                          >
                            {isBusy ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-[0.98]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </GlassPanel>

      {/* Check-in list */}
      <GlassPanel>
        <Section title="Check in" subtitle="Small check-ins, steady progress." icon={Icons.themeCalm}>
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
              <div className="text-[11px] text-stone-500">Total habits</div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{activeHabitStats.total}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-3 py-2">
              <div className="text-[11px] text-amber-800">Due now</div>
              <div className="mt-1 text-sm font-semibold text-amber-900">{activeHabitStats.dueNow}</div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-3 py-2">
              <div className="text-[11px] text-sky-800">In progress</div>
              <div className="mt-1 text-sm font-semibold text-sky-900">{activeHabitStats.inProgress}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
              <div className="text-[11px] text-emerald-800">Completed</div>
              <div className="mt-1 text-sm font-semibold text-emerald-900">
                {activeHabitStats.completed} ({activeHabitStats.completion}%)
              </div>
            </div>
          </div>

          {visibleCheckinHabits.length === 0 ? (
            <EmptyHabitsState
              title="No active habits to check in yet."
              body="Try one habit that feels almost too easy. Tiny habits are easier to return to, and that return is what builds trust."
              chips={["Aim for easy wins", "One habit is enough", "Weekly habits work too"]}
            />
          ) : (
            <HabitList
              habits={visibleCheckinHabits}
              onCheckedIn={load}
              highlightHabitId={focusedHabitId}
              autoOpenReminderForId={openReminder ? focusedHabitId : null}
            />
          )}
        </Section>
      </GlassPanel>
    </div>
  );
}
