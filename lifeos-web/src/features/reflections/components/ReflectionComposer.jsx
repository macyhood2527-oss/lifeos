// lifeos-web/src/features/reflections/components/ReflectionComposer.jsx
import { useEffect, useState } from "react";
import { upsertReflection } from "../reflections.api";

export default function ReflectionComposer({ initial, onSaved }) {
  const [mood, setMood] = useState(initial?.mood ?? 7);

  // Structured fields (backend-supported)
  const [gratitude, setGratitude] = useState(initial?.gratitude ?? "");
  const [highlights, setHighlights] = useState(initial?.highlights ?? "");
  const [challenges, setChallenges] = useState(initial?.challenges ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // When TodayPage reloads and passes a new reflection, sync into local state
  useEffect(() => {
    setMood(initial?.mood ?? 7);
    setGratitude(initial?.gratitude ?? "");
    setHighlights(initial?.highlights ?? "");
    setChallenges(initial?.challenges ?? "");
    setNotes(initial?.notes ?? "");
  }, [initial]);

  async function save() {
    setError(null);
    try {
      setBusy(true);

      await upsertReflection({
        mood,
        gratitude: gratitude.trim() ? gratitude.trim() : null,
        highlights: highlights.trim() ? highlights.trim() : null,
        challenges: challenges.trim() ? challenges.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 1200);

      await onSaved?.();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Could not save reflection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 p-4 space-y-4">
      {/* Mood */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-stone-900">Mood</div>
        <div className="text-sm text-stone-700">{mood}/10</div>
      </div>

      <input
        type="range"
        min="1"
        max="10"
        value={mood}
        onChange={(e) => setMood(Number(e.target.value))}
        className="w-full"
      />

      {/* Structured prompts */}
      <div className="grid gap-3">
        <textarea
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          placeholder="Gratitude — what felt good today?"
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:bg-white"
        />

        <textarea
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder="Highlights — small wins, moments, progress…"
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:bg-white"
        />

        <textarea
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          placeholder="Challenges — anything heavy or tricky?"
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:bg-white"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes — a gentle message for your future self…"
          rows={3}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:bg-white"
        />
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <button
        onClick={save}
        disabled={busy}
        className="rounded-2xl border border-black/10 bg-rose-50 px-4 py-2 text-sm text-rose-900 hover:bg-rose-100 disabled:opacity-60"
      >
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save reflection"}
      </button>
    </div>
  );
}