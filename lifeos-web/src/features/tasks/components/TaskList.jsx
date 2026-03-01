// lifeos-web/src/features/tasks/components/TaskList.jsx
import { useEffect, useMemo, useState } from "react";
import { updateTask, deleteTask } from "../tasks.api";

export default function TaskList({ tasks, onUpdated }) {
  const [busyId, setBusyId] = useState(null); // string | null
  const [openId, setOpenId] = useState(null); // string | null
  const [draftById, setDraftById] = useState({}); // Record<string, Draft>
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
  }

  function closeConfirm() {
    setConfirm(null);
  }

  const list = Array.isArray(tasks) ? tasks : [];

  // Map for quick lookup (also helps draft init)
  const taskById = useMemo(() => {
    const m = new Map();
    for (const t of list) m.set(String(t.id), t);
    return m;
  }, [list]);

  if (!list.length) {
    return <div className="text-sm text-stone-500">No tasks today.</div>;
  }

  function ensureDraftFromTask(t) {
    return {
      due_date: t?.due_date ?? "",
      priority: t?.priority ?? "medium",
      notes: t?.notes ?? "",
    };
  }

  function getDraft(tid) {
    return draftById[tid] ?? ensureDraftFromTask(taskById.get(tid));
  }

  function setDraft(tid, patch) {
    setDraftById((prev) => ({
      ...prev,
      [tid]: { ...getDraft(tid), ...patch },
    }));
  }

  function toggleDetails(t) {
    const tid = String(t.id);

    // init draft the first time you open (so inputs are editable immediately)
    setDraftById((prev) => {
      if (prev[tid]) return prev;
      return { ...prev, [tid]: ensureDraftFromTask(t) };
    });

    setOpenId((curr) => (curr === tid ? null : tid));
  }

  async function setStatus(taskId, status) {
    const tid = String(taskId);
    try {
      setBusyId(tid);
      await updateTask(taskId, { status });
      await onUpdated?.();
      showToast(status === "done" ? "Marked done ✨" : "Back to todo 🌿");
    } catch {
      showToast("Couldn’t update. Try again.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  async function saveDetails(taskId, draft) {
    const tid = String(taskId);
    try {
      setBusyId(tid);
      await updateTask(taskId, {
        due_date: draft.due_date || null,
        priority: draft.priority,
        notes: draft.notes || null,
      });
      await onUpdated?.();
      showToast("Details saved ✨");
    } catch {
      showToast("Save failed. Please retry.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(taskId) {
    const tid = String(taskId);
    setConfirm({
      title: "Delete this task?",
      body: "This can’t be undone.",
      confirmText: "Delete",
      tone: "danger",
      onYes: async () => {
        try {
          setBusyId(tid);
          await deleteTask(taskId);
          await onUpdated?.();
          showToast("Deleted 🧺");
        } catch {
          showToast("Delete failed. Try again.", "warn");
        } finally {
          setBusyId(null);
          closeConfirm();
        }
      },
    });
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={`rounded-2xl border px-4 py-2 text-xs shadow-sm bg-white/90 ${
              toast.tone === "warn"
                ? "border-rose-200 text-rose-700"
                : "border-emerald-200 text-emerald-800"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Confirm */}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-4 shadow-lg">
            <div className="text-sm font-semibold">{confirm.title}</div>
            <div className="mt-1 text-xs text-stone-600">{confirm.body}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeConfirm}
                className="rounded-xl border px-3 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirm.onYes}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {list.map((t) => {
          const tid = String(t.id);
          const isBusy = busyId === tid;
          const isDone = t.status === "done";
          const isOpen = openId === tid;
          const draft = getDraft(tid);

          return (
            <div
              key={tid}
              className="rounded-2xl border border-black/5 bg-white/70 p-3"
            >
              {/* Header */}
              <div className="flex justify-between gap-3">
                <div>
                  <div
                    className={`text-sm font-medium ${
                      isDone ? "line-through text-stone-400" : "text-stone-900"
                    }`}
                  >
                    {t.title}
                  </div>
                  <div className="text-xs text-stone-500">
                    {t.priority ? `Priority: ${t.priority}` : ""}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleDetails(t)}
                    className="rounded-xl border px-3 py-2 text-xs"
                  >
                    {isOpen ? "Hide details" : "Details"}
                  </button>

                  <button
                    disabled={isBusy}
                    onClick={() => setStatus(t.id, isDone ? "todo" : "done")}
                    className="rounded-xl border px-3 py-2 text-xs"
                  >
                    {isDone ? "Undo" : "Done"}
                  </button>

                  <button
                    disabled={isBusy}
                    onClick={() => removeTask(t.id)}
                    className="rounded-xl border px-3 py-2 text-xs text-rose-700"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Details */}
              {isOpen && (
                <div className="mt-3 rounded-xl border border-black/5 bg-white/60 p-3 space-y-3 transition-all duration-200 ease-out">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="date"
                      value={draft.due_date}
                      onChange={(e) => setDraft(tid, { due_date: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-xs"
                    />
                    <select
                      value={draft.priority}
                      onChange={(e) => setDraft(tid, { priority: e.target.value })}
                      className="rounded-xl border px-3 py-2 text-xs"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </div>

                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraft(tid, { notes: e.target.value })}
                    rows={3}
                    placeholder="Optional notes…"
                    className="w-full rounded-xl border px-3 py-2 text-xs"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() =>
                        setDraftById((prev) => ({
                          ...prev,
                          [tid]: ensureDraftFromTask(taskById.get(tid)),
                        }))
                      }
                      className="rounded-xl border px-3 py-2 text-xs"
                    >
                      Reset
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => saveDetails(t.id, draft)}
                      className="rounded-xl border bg-emerald-50 px-3 py-2 text-xs text-emerald-900"
                    >
                      {isBusy ? "Saving…" : "Save details"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
