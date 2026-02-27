// lifeos-web/src/features/tasks/components/TaskList.jsx
import { useState } from "react";
import { updateTask, deleteTask } from "../tasks.api";

/**
 * TaskList UX (aligned to your backend):
 * - Details: UI-only expand/collapse
 * - Done: PATCH status -> "done"
 * - Undo: PATCH status -> "todo"
 * - Edit in Details: due_date (YYYY-MM-DD), priority (low/medium/high), notes
 * - Trash: DELETE /api/tasks/:id with confirm
 *
 * Props:
 * - tasks: array of task objects (from backend)
 * - onUpdated: callback after any mutation (should trigger reload/refetch)
 */
export default function TaskList({ tasks, onUpdated }) {
  const [busyId, setBusyId] = useState(null);       // task id being saved/deleted
  const [openId, setOpenId] = useState(null);       // details expanded task id
  const [draftById, setDraftById] = useState({});   // temporary edits per task id

  const list = Array.isArray(tasks) ? tasks : [];
  if (!list.length) return <div className="text-sm text-stone-500">No tasks today.</div>;

  function ensureDraft(t) {
    return (
      draftById[t.id] ?? {
        due_date: t.due_date ?? "",
        priority: t.priority ?? "medium",
        notes: t.notes ?? "",
      }
    );
  }

  function setDraft(taskId, patch) {
    setDraftById((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], ...patch },
    }));
  }

  async function setStatus(taskId, status) {
    try {
      setBusyId(taskId);
      await updateTask(taskId, { status }); // backend status enum: backlog|todo|doing|done
      await onUpdated?.(taskId);
    } finally {
      setBusyId(null);
    }
  }

  async function saveDetails(taskId, draft) {
    try {
      setBusyId(taskId);

      await updateTask(taskId, {
        due_date: draft.due_date ? draft.due_date : null,
        priority: draft.priority,
        notes: draft.notes ? draft.notes : null,
      });

      await onUpdated?.(taskId);
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(taskId) {
    const yes = window.confirm("Delete this task? This can’t be undone.");
    if (!yes) return;

    try {
      setBusyId(taskId);
      await deleteTask(taskId);
      await onUpdated?.(taskId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-2">
      {list.map((t) => {
        const isBusy = busyId === t.id;
        const isDone = t.status === "done";
        const isOpen = openId === t.id;

        const draft = ensureDraft(t);

        return (
          <div
            key={t.id}
            className="w-full rounded-2xl border border-black/5 bg-white/70 p-3"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium truncate ${
                    isDone ? "line-through text-stone-400" : "text-stone-900"
                  }`}
                  title={t.title}
                >
                  {t.title}
                </div>

                <div className="mt-1 text-xs text-stone-500">
                  {t.priority ? `Priority: ${t.priority}` : "\u00A0"}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = isOpen ? null : t.id;
                    setOpenId(nextOpen);

                    if (!isOpen) {
                      // initialize draft when opening
                      setDraftById((prev) => ({
                        ...prev,
                        [t.id]: {
                          due_date: t.due_date ?? "",
                          priority: t.priority ?? "medium",
                          notes: t.notes ?? "",
                        },
                      }));
                    }
                  }}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  {isOpen ? "Hide details" : "Details"}
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setStatus(t.id, isDone ? "todo" : "done")}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition disabled:opacity-60 ${
                    isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                      : "border-black/10 bg-white text-stone-900 hover:bg-stone-50"
                  }`}
                >
                  {isBusy ? "Saving…" : isDone ? "Undo" : "Done"}
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => removeTask(t.id)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  title="Delete task"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Details panel (UI only, but can save fields) */}
            {isOpen ? (
              <div className="mt-3 rounded-xl border border-black/5 bg-white/60 p-3 space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-xs text-stone-500">Due date</div>
                    <input
                      type="date"
                      value={draft.due_date}
                      onChange={(e) => setDraft(t.id, { due_date: e.target.value })}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs text-stone-500">Priority</div>
                    <select
                      value={draft.priority}
                      onChange={(e) => setDraft(t.id, { priority: e.target.value })}
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
                    >
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                    </select>
                  </label>
                </div>

                <label className="space-y-1 block">
                  <div className="text-xs text-stone-500">Notes</div>
                  <textarea
                    value={draft.notes}
                    onChange={(e) => setDraft(t.id, { notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
                    placeholder="Optional notes…"
                  />
                </label>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] text-stone-500">
                    Status: <span className="text-stone-700">{t.status ?? "—"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        // reset draft to current task values
                        setDraftById((prev) => ({
                          ...prev,
                          [t.id]: {
                            due_date: t.due_date ?? "",
                            priority: t.priority ?? "medium",
                            notes: t.notes ?? "",
                          },
                        }));
                      }}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => saveDetails(t.id, ensureDraft(t))}
                      className="rounded-xl border border-black/10 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {isBusy ? "Saving…" : "Save details"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}