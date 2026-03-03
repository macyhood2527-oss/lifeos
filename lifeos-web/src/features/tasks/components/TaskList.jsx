// lifeos-web/src/features/tasks/components/TaskList.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { updateTask, deleteTask } from "../tasks.api";

export default function TaskList({ tasks, onUpdated }) {
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [draftById, setDraftById] = useState({});
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Drag state
  const [dragId, setDragId] = useState(null);

  // Done column collapse
  const [doneOpen, setDoneOpen] = useState(false);

  // Animation: mark tasks that just moved columns
  const [justMoved, setJustMoved] = useState({}); // { [tid]: "toDone" | "toTodo" }
  const moveTimersRef = useRef(new Map()); // tid -> timeout

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

  const todo = list.filter((t) => t.status !== "done");
  const done = list.filter((t) => t.status === "done");

  // Auto-collapse done column when empty
  useEffect(() => {
    if (done.length === 0) setDoneOpen(false);
  }, [done.length]);

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

    setDraftById((prev) => {
      if (prev[tid]) return prev;
      return { ...prev, [tid]: ensureDraftFromTask(t) };
    });

    setOpenId((curr) => (curr === tid ? null : tid));
  }

  function markMoved(tid, dir) {
    // dir: "toDone" | "toTodo"
    setJustMoved((prev) => ({ ...prev, [tid]: dir }));

    const timers = moveTimersRef.current;
    if (timers.has(tid)) clearTimeout(timers.get(tid));

    const tt = setTimeout(() => {
      setJustMoved((prev) => {
        const next = { ...prev };
        delete next[tid];
        return next;
      });
      timers.delete(tid);
    }, 520);

    timers.set(tid, tt);
  }

  async function setStatus(taskId, status, opts = {}) {
    const tid = String(taskId);

    // optimistic animation marker (UI-feel)
    if (status === "done") markMoved(tid, "toDone");
    else markMoved(tid, "toTodo");

    try {
      setBusyId(tid);
      await updateTask(taskId, { status });
      await onUpdated?.();

      if (status === "done") {
        showToast("Marked done ✨");
        // keep Done column collapsed by default; don’t auto-open unless user chooses
      } else {
        showToast("Back to todo 🌿");
      }
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

  function PriorityBadge({ priority }) {
    const styles = {
      low: "bg-emerald-50 text-emerald-700 border-emerald-200",
      medium: "bg-sky-50 text-sky-700 border-sky-200",
      high: "bg-rose-50 text-rose-700 border-rose-200",
    };
    return (
      <span
        className={`text-[10px] px-2 py-1 rounded-full border ${
          styles[priority] || styles.medium
        }`}
      >
        {priority}
      </span>
    );
  }

  // ===== Drag & drop handlers =====
  function onDragStart(e, t) {
    const tid = String(t.id);
    setDragId(tid);
    try {
      e.dataTransfer.setData("text/plain", tid);
      e.dataTransfer.effectAllowed = "move";
    } catch {
      // some environments might restrict; we'll rely on state fallback
    }
  }

  function onDragEnd() {
    setDragId(null);
  }

  async function handleDropToStatus(e, status) {
    e.preventDefault();
    const tid = e.dataTransfer?.getData?.("text/plain") || dragId;
    if (!tid) return;

    const t = taskById.get(String(tid));
    if (!t) return;

    // no-op if already same status
    const current = t.status === "done" ? "done" : "todo";
    const target = status === "done" ? "done" : "todo";
    if (current === target) return;

    // avoid double actions while busy
    if (busyId) return;

    await setStatus(t.id, status);
    setDragId(null);
  }

  function allowDrop(e) {
    e.preventDefault();
  }

  // ===== Card =====
  function TaskCard(t) {
    const tid = String(t.id);
    const isBusy = busyId === tid;
    const isDone = t.status === "done";
    const isOpen = openId === tid;
    const draft = getDraft(tid);

    const moveClass =
      justMoved[tid] === "toDone"
        ? "task-slide-to-done"
        : justMoved[tid] === "toTodo"
        ? "task-slide-to-todo"
        : "";

    const isDragging = dragId === tid;

    return (
      <div
        key={tid}
        draggable={!isBusy}
        onDragStart={(e) => onDragStart(e, t)}
        onDragEnd={onDragEnd}
        className={[
          "rounded-2xl border p-3 bg-white/80 backdrop-blur transition",
          "hover:-translate-y-[1px] hover:shadow-sm",
          isDone ? "opacity-70" : "",
          isDragging ? "ring-2 ring-black/10 opacity-60" : "",
          moveClass,
        ].join(" ")}
      >
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`text-sm font-medium truncate ${
                isDone ? "line-through text-stone-400" : "text-stone-900"
              }`}
              title={t.title}
            >
              {t.title}
            </div>

            <div className="mt-1 flex items-center gap-2 text-xs text-stone-500 flex-wrap">
              {t.priority && <PriorityBadge priority={t.priority} />}
              {t.due_date ? <span>Due {t.due_date}</span> : <span className="opacity-60">No due date</span>}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => toggleDetails(t)}
              className="rounded-xl border px-2 py-1 text-[11px] hover:bg-stone-50 active:scale-[0.98] transition"
            >
              {isOpen ? "Hide" : "Details"}
            </button>

            <button
              disabled={isBusy}
              onClick={() => setStatus(t.id, isDone ? "todo" : "done")}
              className="rounded-xl border px-2 py-1 text-[11px] hover:bg-stone-50 active:scale-[0.98] transition"
            >
              {isDone ? "Undo" : "Done"}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="mt-3 rounded-xl border bg-white/60 p-3 space-y-3">
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

            <div className="flex justify-between items-center">
              <button
                onClick={() => removeTask(t.id)}
                className="text-xs text-rose-600 hover:text-rose-700"
              >
                Delete
              </button>

              <button
                disabled={isBusy}
                onClick={() => saveDetails(t.id, draft)}
                className="rounded-xl border bg-emerald-50 px-3 py-2 text-xs text-emerald-900 hover:bg-emerald-100 active:scale-[0.98] transition"
              >
                {isBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Done column visibility rules:
  const showDoneColumn = done.length > 0 && doneOpen;

  return (
    <div className="relative">
      {/* Local keyframes for slide animation */}
      <style>{`
        @keyframes slideToDone {
          0% { transform: translateX(0px); opacity: 1; }
          60% { transform: translateX(12px); opacity: 0.65; }
          100% { transform: translateX(0px); opacity: 0.85; }
        }
        @keyframes slideToTodo {
          0% { transform: translateX(0px); opacity: 0.7; }
          60% { transform: translateX(-12px); opacity: 0.6; }
          100% { transform: translateX(0px); opacity: 1; }
        }
        .task-slide-to-done { animation: slideToDone 520ms ease-out; }
        .task-slide-to-todo { animation: slideToTodo 520ms ease-out; }
      `}</style>

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

      {/* Top row: Done collapse toggle */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs text-stone-500">
          Tip: drag a task card to move it between columns ✨
        </div>

        <button
          type="button"
          onClick={() => setDoneOpen((v) => !v)}
          disabled={done.length === 0}
          className={`rounded-xl border px-3 py-2 text-[11px] transition active:scale-[0.98] ${
            done.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-stone-50"
          }`}
        >
          {done.length === 0
            ? "Done (0)"
            : doneOpen
            ? `Hide done (${done.length})`
            : `Show done (${done.length})`}
        </button>
      </div>

      {/* Kanban Layout */}
      <div
        className={`grid gap-6 ${
          showDoneColumn ? "md:grid-cols-2" : "md:grid-cols-1"
        }`}
      >
        {/* Todo Column */}
        <div
          onDragOver={allowDrop}
          onDrop={(e) => handleDropToStatus(e, "todo")}
          className={`rounded-3xl border border-black/5 bg-white/50 p-3`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              To do ({todo.length})
            </div>
            <div className="text-[11px] text-stone-400">Drop here</div>
          </div>

          {todo.length === 0 ? (
            <div className="rounded-2xl bg-white/60 border border-black/5 p-4 text-sm text-stone-500">
              All clear for now 🌿
            </div>
          ) : (
            <div className="space-y-3">{todo.map((t) => TaskCard(t))}</div>
          )}
        </div>

        {/* Done Column (collapsible) */}
        {showDoneColumn ? (
          <div
            onDragOver={allowDrop}
            onDrop={(e) => handleDropToStatus(e, "done")}
            className={`rounded-3xl border border-black/5 bg-white/40 p-3`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Done ({done.length})
              </div>
              <div className="text-[11px] text-stone-400">Drop here</div>
            </div>

            <div className="space-y-3">{done.map((t) => TaskCard(t))}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
