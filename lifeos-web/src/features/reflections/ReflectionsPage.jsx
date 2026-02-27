import { useEffect, useMemo, useState } from "react";
import Section from "../../shared/ui/Section";
import ReflectionComposer from "./components/ReflectionComposer";
import { getTodayReflection } from "../today/today.api";
import { listReflections } from "./reflections.api";

function ymdLocal(d) {
  // local YYYY-MM-DD (good enough for B2 UI)
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function monthLabel(d) {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function weekdayShortLabels() {
  // Mon–Sun labels
  const base = new Date(2026, 1, 2); // a Monday-ish reference; actual date doesn't matter much
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(base);
    dd.setDate(base.getDate() + i);
    labels.push(dd.toLocaleDateString(undefined, { weekday: "short" }));
  }
  return labels;
}

function monStartIndex(jsDay) {
  // convert JS day 0=Sun..6=Sat to Mon-start index 0=Mon..6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

function buildMonthGrid(viewDate) {
  const first = startOfMonth(viewDate);
  const last = endOfMonth(viewDate);

  const firstPad = monStartIndex(first.getDay()); // 0..6
  const daysInMonth = last.getDate();

  const cells = [];
  
  for (let i = 0; i < firstPad; i++) cells.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    cells.push(date);
  }

  // pad to full weeks (multiple of 7)
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function previewText(r) {
  const pick =
    r?.highlights?.trim() ||
    r?.gratitude?.trim() ||
    r?.challenges?.trim() ||
    r?.notes?.trim() ||
    "";
  if (!pick) return "—";
  return pick.length > 80 ? pick.slice(0, 80) + "…" : pick;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpRGB(c1, c2, t) {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t)),
  };
}

function rgbToCss({ r, g, b }) {
  return `rgb(${r}, ${g}, ${b})`;
}

// Pastel palette anchors (you can tweak)
const MOOD_LOW = { r: 186, g: 224, b: 255 }; // pastel blue
const MOOD_MID = { r: 210, g: 190, b: 255 }; // pastel purple
const MOOD_HIGH = { r: 255, g: 200, b: 225 }; // pastel pink

function moodToPastelColor(mood) {
  const m = Number(mood);
  if (!Number.isFinite(m)) return null;

  // clamp 1..10
  const x = Math.max(1, Math.min(10, m));

  // piecewise blend:
  // 1..6 -> blue -> purple
  // 6..10 -> purple -> pink
  if (x <= 6) {
    const t = (x - 1) / (6 - 1); // 0..1
    return rgbToCss(lerpRGB(MOOD_LOW, MOOD_MID, t));
  } else {
    const t = (x - 6) / (10 - 6); // 0..1
    return rgbToCss(lerpRGB(MOOD_MID, MOOD_HIGH, t));
  }
}

export default function ReflectionsPage() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(null);
  const [all, setAll] = useState([]);

  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedYMD, setSelectedYMD] = useState(() => ymdLocal(new Date()));

  async function load() {
    const [t, list] = await Promise.all([
      getTodayReflection(),
      listReflections({ limit: 120 }),
    ]);

    setToday(t ?? null);
    setAll(Array.isArray(list) ? list : []);
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
  }, []);

  const todayYMD = useMemo(() => ymdLocal(new Date()), []);

  // map for calendar dots + selected lookup
  const byDate = useMemo(() => {
    const m = new Map();
    for (const r of Array.isArray(all) ? all : []) {
      const key = String(r.reflect_date).slice(0, 10);
      m.set(key, r);
    }
    // ensure today's is included even if list didn't include it yet
    if (today?.reflect_date) m.set(String(today.reflect_date).slice(0, 10), today);
    return m;
  }, [all, today]);

  const selected = useMemo(() => byDate.get(selectedYMD) ?? null, [byDate, selectedYMD]);

  const monthCells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const weekLabels = useMemo(() => weekdayShortLabels(), []);

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  return (
    <div className="space-y-8">
      <Section
        title="Reflections"
        subtitle="Browse your days without clutter."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Calendar */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewDate((d) => addMonths(d, -1))}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
              >
                ←
              </button>

              <div className="text-sm font-medium text-stone-900">
                {monthLabel(viewDate)}
              </div>

              <button
                type="button"
                onClick={() => setViewDate((d) => addMonths(d, 1))}
                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50"
              >
                →
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] text-stone-500">
              {weekLabels.map((w) => (
                <div key={w} className="text-center">{w}</div>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {monthCells.map((d, idx) => {
                if (!d) {
                  return <div key={idx} className="h-10" />;
                }

                const key = ymdLocal(d);
                const has = byDate.has(key);
                const isSel = key === selectedYMD;
                const isToday = key === todayYMD;
                const ref = byDate.get(key);
const moodBg = ref?.mood != null ? moodToPastelColor(ref.mood) : null;

                return (
                  <button
  key={key}
  type="button"
  onClick={() => setSelectedYMD(key)}
  style={moodBg ? { backgroundColor: moodBg } : undefined}
  className={`h-10 rounded-xl border text-xs transition flex flex-col items-center justify-center gap-0.5
    ${isSel ? "border-emerald-300 ring-2 ring-emerald-200" : "border-black/10"}
    ${moodBg ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]" : "bg-white hover:bg-stone-50"}
  `}
  title={key}
>
  <div className={`${isToday ? "font-semibold text-emerald-900" : "text-stone-900"}`}>
    {d.getDate()}
  </div>

  {/* keep your dot if you want, or remove since mood color already indicates */}

</button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-stone-500">
              Days are softly tinted by mood (blue → purple → pink).
            </div>
          </div>

          {/* Selected Day */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-900">
                  {selectedYMD}
                </div>
                <div className="mt-1 text-xs text-stone-500">
                  {selected ? `Updated: ${String(selected.updated_at ?? "").slice(0, 19)}` : "No reflection yet."}
                </div>
              </div>

              {selected?.mood != null ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Mood {selected.mood}/10
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-600">
                  Mood —
                </div>
              )}
            </div>

            {/* B2 rule: only today is editable */}
            {selectedYMD === todayYMD ? (
              <div className="mt-3">
                <ReflectionComposer initial={today} onSaved={load} />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {selected ? (
                  <>
                    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
                      <div className="text-xs text-stone-500">Gratitude</div>
                      <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                        {selected.gratitude ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
                      <div className="text-xs text-stone-500">Highlights</div>
                      <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                        {selected.highlights ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
                      <div className="text-xs text-stone-500">Challenges</div>
                      <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                        {selected.challenges ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
                      <div className="text-xs text-stone-500">Notes</div>
                      <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                        {selected.notes ?? "—"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
                    No reflection saved for this day.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Compact recent list */}
        <div className="mt-4 rounded-2xl border border-black/5 bg-white/70 p-4">
          <div className="text-sm font-medium text-stone-900">Recent</div>
          <div className="mt-2 space-y-2">
            {(Array.isArray(all) ? all : []).slice(0, 12).map((r) => {
              const key = String(r.reflect_date).slice(0, 10);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedYMD(key);
                    // if recent item is from another month, jump calendar view too
                    const dt = new Date(key + "T00:00:00");
                    setViewDate(startOfMonth(dt));
                  }}
                  className="w-full text-left rounded-xl border border-black/10 bg-white px-3 py-2 hover:bg-stone-50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-stone-600">{key}</div>
                    <div className="text-xs text-stone-500">{r.mood != null ? `${r.mood}/10` : "—"}</div>
                  </div>
                  <div className="mt-1 text-sm text-stone-900">
                    {previewText(r)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}