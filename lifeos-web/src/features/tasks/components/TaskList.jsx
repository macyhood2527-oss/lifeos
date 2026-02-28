// lifeos-web/src/features/tasks/components/TaskList.jsx
import { useEffect, useState } from "react";
import { updateTask, deleteTask } from "../tasks.api";

export default function TaskList({ tasks, onUpdated }) {
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [draftById, setDraftById] = useState({});

  // Toast
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
  }

  // Confirm modal
  const [confirm, setConfirm] = useState(null);
  function askConfirm(payload) {
    setConfirm(payload);
  }
  function closeConfirm() {
    setConfirm(null);
  }

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
      [taskId]: { ...(prev[taskId] ?? ensureDraft({ id: taskId })), ...patch },
    }));
  }

  async function setStatus(taskId, status) {
    try {
      setBusyId(taskId);
      await updateTask(taskId, { status });
      await onUpdated?.(taskId);

      showToast(status === "done" ? "Marked done 🌿" : "Back to todo", "ok");
    } catch (e) {
      showToast("Couldn’t update. Try again.", "warn");
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
      showToast("Details saved", "ok");
    } catch (e) {
      showToast("Save failed. Please retry.", "warn");
    } finally {
      setBusyId(null);
    }
  }

  async function removeTask(taskId) {
    askConfirm({
      title: "Delete this task?",
      body: "This can’t be undone.",
      confirmText: "Delete",
      tone: "danger",
      onYes: async () => {
        try {
          setBusyId(taskId);
          await deleteTask(taskId);
          await onUpdated?.(taskId);
          showToast("Deleted", "ok");
        } catch (e) {
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
      {toast ? (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={[
              "rounded-2xl border px-4 py-2 text-xs shadow-sm backdrop-blur bg-white/90",
              toast.tone === "warn"
                ? "border-rose-200 text-rose-700"
                : "border-emerald-200 text-emerald-800",
            ].join(" ")}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {/* Confirm Modal (NO backdrop panel) */}
      {confirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm rounded-3xl border border-black/10 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="text-sm font-semibold text-stone-900">{confirm.title}</div>
            <div className="mt-1 text-xs text-stone-600">{confirm.body}</div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirm.onYes}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 hover:bg-rose-100"
              >
                {confirm.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* List */}
      <div className="space-y-2">
        {list.map((t) => {
          const isBusy = busyId === t.id;
          const isDone = t.status === "done";
          const isOpen = openId === t.id;

          const draft = ensureDraft(t);

          return (
            <div
              key={t.id}
              className="relative w-full rounded-2xl border border-black/5 bg-white/70 p-3 transition-transform duration-150 hover:-translate-y-[1px]"
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

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : t.id)}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
                  >
                    {isOpen ? "Hide details" : "Details"}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setStatus(t.id, isDone ? "todo" : "done")}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
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
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 rounded-xl border border-black/5 bg-white/60 p-3 space-y-3">
                  {/* details unchanged */}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
