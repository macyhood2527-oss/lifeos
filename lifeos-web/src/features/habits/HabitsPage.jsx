import { useEffect, useMemo, useState } from "react";
import Section from "../../shared/ui/Section";
import HabitList from "./components/HabitList";
import { listHabits, createHabit, updateHabit, deleteHabit } from "./habits.api";
// If you already created Sparkle.jsx earlier, you can uncomment this and use it later.
 import Sparkle from "../../shared/ui/Sparkle";

function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function HabitsPage() {
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);

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

  async function load() {
    const h = await listHabits({ includeInactive });
    setHabits(h ?? []);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [includeInactive]);

  const activeHabits = useMemo(
    () => (Array.isArray(habits) ? habits : []).filter((h) => Number(h.active) === 1),
    [habits]
  );

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
    } catch (e) {
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
      showToast("Changes saved ✨", "ok");
    } catch (e) {
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
          showToast("Habit disabled 🧺", "ok");
        } catch (e) {
          showToast("Disable failed. Try again.", "warn");
        } finally {
          setBusyId(null);
          closeConfirm();
        }
      },
    });
  }

  if (loading) return <div className="text-stone-500">Loading…</div>;

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
            // Subtle vignette: lighter center, darker edges (not edgy black)
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

      {/* Manage */}
      <GlassPanel>
        <Section title="Habits" subtitle="Create, tweak, and keep your rhythms gentle.">
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
            {(Array.isArray(habits) ? habits : []).map((h) => {
              const isEditing = editId === h.id;
              const isBusy = busyId === h.id;
              const isInactive = Number(h.active) === 0;

              return (
                <div
                  key={h.id}
                  className={[
                    "rounded-2xl border p-3 transition-transform duration-150 ease-out hover:-translate-y-[1px]",
                    isInactive ? "border-black/5 bg-stone-50/60 opacity-75" : "border-black/5 bg-white/70",
                  ].join(" ")}
                >
                  {!isEditing ? (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-stone-900 truncate">{h.name}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {h.cadence} • target {h.target_per_period} per period {isInactive ? "• inactive" : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(h)}
                          className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 active:scale-[0.98]"
                        >
                          Edit
                        </button>

                        {!isInactive ? (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => disableHabit(h.id)}
                            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 active:scale-[0.98] disabled:opacity-60"
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
        <Section title="Check in" subtitle="Small check-ins, steady progress.">
          {activeHabits.length === 0 ? (
            <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
              No active habits yet. Add one above — start tiny.
            </div>
          ) : (
            <HabitList habits={activeHabits} onCheckedIn={load} />
          )}
        </Section>
      </GlassPanel>
    </div>
  );
}
