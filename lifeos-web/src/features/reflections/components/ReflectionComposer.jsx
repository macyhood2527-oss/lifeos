// lifeos-web/src/features/reflections/components/ReflectionComposer.jsx
import { useEffect, useMemo, useState } from "react";
import { upsertReflection } from "../reflections.api";

function formatTime(date) {
  if (!date) return null;
  try {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

export default function ReflectionComposer({ initial, onSaved }) {
  const [mood, setMood] = useState(initial?.mood ?? 7);

  const [gratitude, setGratitude] = useState(initial?.gratitude ?? "");
  const [highlights, setHighlights] = useState(initial?.highlights ?? "");
  const [challenges, setChallenges] = useState(initial?.challenges ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const [toast, setToast] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(
    initial?.updated_at ? formatTime(initial.updated_at) : null
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1400);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(message, tone = "ok") {
    setToast({ message, tone });
  }

  const isLogged = useMemo(() => {
    if (!initial) return false;
    const hasText =
      Boolean((initial?.gratitude ?? "").trim()) ||
      Boolean((initial?.highlights ?? "").trim()) ||
      Boolean((initial?.challenges ?? "").trim()) ||
      Boolean((initial?.notes ?? "").trim());
    const hasMood = initial?.mood != null;
    return hasMood || hasText;
  }, [initial]);

  useEffect(() => {
    setMood(initial?.mood ?? 7);
    setGratitude(initial?.gratitude ?? "");
    setHighlights(initial?.highlights ?? "");
    setChallenges(initial?.challenges ?? "");
    setNotes(initial?.notes ?? "");
    setLastSavedAt(initial?.updated_at ? formatTime(initial.updated_at) : null);
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

      const now = new Date();
      setLastSavedAt(formatTime(now));

      setSaved(true);
      setTimeout(() => setSaved(false), 1200);

      showToast("Reflection saved", "ok");
      await onSaved?.();
    } catch (err) {
      console.error(err);
      const msg = err?.message || "Could not save reflection.";
      setError(msg);
      showToast("Save failed. Try again.", "warn");
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.round(((mood - 1) / 9) * 100);

  return (
    <div className="relative rounded-2xl border border-black/5 bg-white/70 p-4 space-y-4">
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

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-stone-900">Mood</div>

          {isLogged ? (
            <span className="text-[11px] rounded-xl border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-emerald-900">
              logged
            </span>
          ) : null}
        </div>

        <div className="text-sm text-stone-700">{mood}/10</div>
      </div>

      {/* Pastel slider */}
      <input
        type="range"
        min="1"
        max="10"
        value={mood}
        onChange={(e) => setMood(Number(e.target.value))}
        className="w-full accent-emerald-500"
        style={{
          background: `linear-gradient(to right,
            rgba(16,185,129,0.35) 0%,
            rgba(16,185,129,0.35) ${pct}%,
            rgba(0,0,0,0.08) ${pct}%,
            rgba(0,0,0,0.08) 100%)`,
          height: 8,
          borderRadius: 999,
          outline: "none",
          appearance: "none",
        }}
      />

      {/* Prompts */}
      <div className="grid gap-3">
        <textarea
          value={gratitude}
          onChange={(e) => setGratitude(e.target.value)}
          placeholder="Gratitude — what felt good today?"
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
        />

        <textarea
          value={highlights}
          onChange={(e) => setHighlights(e.target.value)}
          placeholder="Highlights — small wins, moments, progress…"
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
        />

        <textarea
          value={challenges}
          onChange={(e) => setChallenges(e.target.value)}
          placeholder="Challenges — anything heavy or tricky?"
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes — a gentle message for your future self…"
          rows={3}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
        />
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-900">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-2xl border border-black/10 bg-rose-50 px-4 py-2 text-sm text-rose-900 hover:bg-rose-100 disabled:opacity-60"
        >
          {busy ? "Saving…" : saved ? "Saved ✓" : "Save reflection"}
        </button>

        {lastSavedAt && (
          <div className="text-[11px] text-stone-500">
            Last saved at {lastSavedAt}
          </div>
        )}
      </div>
    </div>
  );
}
