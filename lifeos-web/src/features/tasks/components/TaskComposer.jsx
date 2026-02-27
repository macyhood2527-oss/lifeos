import { useState } from "react";
import { createTask } from "../tasks.api";

export default function TaskComposer({ onCreated }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);

    const t = title.trim();
    if (!t) return;

    try {
      setBusy(true);
  
      const task = await createTask({ title: t }); // task object
setTitle("");
await onCreated?.(task);


    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not create task.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task for today…"
          className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm outline-none focus:bg-white"
        />
        <button
          disabled={busy}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm hover:bg-white/85 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}
    </div>
  );
}