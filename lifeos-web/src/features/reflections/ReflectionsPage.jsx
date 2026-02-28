import { useEffect, useMemo, useState } from "react";
import Section from "../../shared/ui/Section";
import ReflectionComposer from "./components/ReflectionComposer";
import { getTodayReflection } from "../today/today.api";
import { listReflections } from "./reflections.api";

/* =========================
   Glass wrapper (since main panel removed)
========================= */
function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

/* =========================
   Date helpers
========================= */
function ymdLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtYMD(d) {
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
  const base = new Date(2026, 1, 2);
  const labels = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(base);
    dd.setDate(base.getDate() + i);
    labels.push(dd.toLocaleDateString(undefined, { weekday: "short" }));
  }
  return labels;
}

function monStartIndex(jsDay) {
  // JS day 0=Sun..6=Sat -> Mon-start index 0=Mon..6=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}

function buildMonthGrid(viewDate) {
  const first = startOfMonth(viewDate);
  const last = endOfMonth(viewDate);

  const firstPad = monStartIndex(first.getDay());
  const daysInMonth = last.getDate();

  const cells = [];
  for (let i = 0; i < firstPad; i++) cells.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    cells.push(date);
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = day === 0 ? -6 : 1 - day; // go back to Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
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

/* =========================
   Mood tint helpers
========================= */
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

// Pastel anchors: blue -> purple -> pink
const MOOD_LOW = { r: 186, g: 224, b: 255 };
const MOOD_MID = { r: 210, g: 190, b: 255 };
const MOOD_HIGH = { r: 255, g: 200, b: 225 };

function moodToPastelColor(mood) {
  const m = Number(mood);
  if (!Number.isFinite(m)) return null;

  const x = Math.max(1, Math.min(10, m));

  if (x <= 6) {
    const t = (x - 1) / (6 - 1);
    return rgbToCss(lerpRGB(MOOD_LOW, MOOD_MID, t));
  } else {
    const t = (x - 6) / (10 - 6);
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

  // Map reflections by date (YYYY-MM-DD)
  const byDate = useMemo(() => {
    const m = new Map();
    for (const r of Array.isArray(all) ? all : []) {
      const key = String(r.reflect_date).slice(0, 10);
      m.set(key, r);
    }
    if (today?.reflect_date) m.set(String(today.reflect_date).slice(0, 10), today);
    return m;
  }, [all, today]);

  const selected = useMemo(() => byDate.get(selectedYMD) ?? null, [byDate, selectedYMD]);

  const monthCells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const weekLabels = useMemo(() => weekdayShortLabels(), []);

  // 7-day mood strip for the selected week (Mon-Sun)
  const selectedDateObj = useMemo(
    () => new Date(selectedYMD + "T00:00:00"),
    [selectedYMD]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(selectedDateObj);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = fmtYMD(d);
      const ref = byDate.get(key);
      const moodBg = ref?.mood != null ? moodToPastelColor(ref.mood) : null;
      return { d, key, ref, moodBg };
    });
  }, [selectedDateObj, byDate]);

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  return (
    <div className="space-y-8">
      <GlassPanel>
        <Section title="Reflections" subtitle="Browse your days without clutter.">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Calendar */}
            <div className="rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewDate((d) => addMonths(d, -1))}
                  className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition"
                >
                  ←
                </button>

                <div className="text-sm font-medium text-stone-900">
                  {monthLabel(viewDate)}
                </div>

                <button
                  type="button"
                  onClick={() => setViewDate((d) => addMonths(d, 1))}
                  className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition"
                >
                  →
                </button>
              </div>

              {/* Mood week strip (7 boxes) */}
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-stone-500">Mood this week</div>
                  <div className="text-xs text-stone-500">Mon → Sun</div>
                </div>

                <div className="mt-2 grid grid-cols-7 gap-2">
                  {weekDays.map((w) => {
                    const isSel = w.key === selectedYMD;
                    const label = w.d.toLocaleDateString(undefined, { weekday: "short" });

                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => {
                          setSelectedYMD(w.key);
                          setViewDate(startOfMonth(w.d));
                        }}
                        className={`h-9 rounded-2xl border transition active:scale-[0.98] ${
                          isSel
                            ? "border-emerald-300 ring-2 ring-emerald-200"
                            : "border-black/10"
                        }`}
                        style={{
                          backgroundColor: w.moodBg ?? "rgba(255,255,255,0.65)",
                        }}
                        title={
                          w.ref?.mood != null
                            ? `${w.key} — mood ${w.ref.mood}/10`
                            : `${w.key} — no mood`
                        }
                      >
                        <div className="flex h-full flex-col items-center justify-center leading-tight">
                          <div className="text-[10px] text-stone-700">{label}</div>
                          <div
                            className={`text-xs ${
                              w.ref?.mood != null ? "text-stone-900" : "text-stone-500"
                            }`}
                          >
                            {w.ref?.mood != null ? w.ref.mood : "—"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekday labels */}
              <div className="mt-3 grid grid-cols-7 gap-2 text-[11px] text-stone-500">
                {weekLabels.map((w) => (
                  <div key={w} className="text-center">
                    {w}
                  </div>
                ))}
              </div>

              {/* Month grid */}
              <div className="mt-2 grid grid-cols-7 gap-2">
                {monthCells.map((d, idx) => {
                  if (!d) return <div key={idx} className="h-10" />;

                  const key = ymdLocal(d);
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
                      className={`h-10 rounded-xl border text-xs transition flex flex-col items-center justify-center
                        ${isSel ? "border-emerald-300 ring-2 ring-emerald-200" : "border-black/10"}
                        ${
                          moodBg
                            ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                            : "bg-white/80 hover:bg-stone-50"
                        }
                      `}
                      title={key}
                    >
                      <div className={isToday ? "font-semibold text-emerald-900" : "text-stone-900"}>
                        {d.getDate()}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-stone-500">
                Days are softly tinted by mood (blue → purple → pink).
              </div>
            </div>

            {/* Selected Day */}
            <div className="rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-stone-900">{selectedYMD}</div>
                  <div className="mt-1 text-xs text-stone-500">
                    {selected
                      ? `Updated: ${String(selected.updated_at ?? "").slice(0, 19)}`
                      : "No reflection yet."}
                  </div>
                </div>

                {selected?.mood != null ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                    Mood {selected.mood}/10
                  </div>
                ) : (
                  <div className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-stone-600">
                    Mood —
                  </div>
                )}
              </div>

              {/* Only today is editable */}
              {selectedYMD === todayYMD ? (
                <div className="mt-3">
                  <ReflectionComposer initial={today} onSaved={load} />
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {selected ? (
                    <>
                      <div className="rounded-xl border border-black/5 bg-white/55 p-3 backdrop-blur-sm">
                        <div className="text-xs text-stone-500">Gratitude</div>
                        <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                          {selected.gratitude ?? "—"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-black/5 bg-white/55 p-3 backdrop-blur-sm">
                        <div className="text-xs text-stone-500">Highlights</div>
                        <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                          {selected.highlights ?? "—"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-black/5 bg-white/55 p-3 backdrop-blur-sm">
                        <div className="text-xs text-stone-500">Challenges</div>
                        <div className="mt-1 text-sm text-stone-900 whitespace-pre-wrap">
                          {selected.challenges ?? "—"}
                        </div>
                      </div>

                      <div className="rounded-xl border border-black/5 bg-white/55 p-3 backdrop-blur-sm">
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

          {/* Recent list */}
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm">
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
                      const dt = new Date(key + "T00:00:00");
                      setViewDate(startOfMonth(dt));
                    }}
                    className="w-full text-left rounded-xl border border-black/10 bg-white/80 px-3 py-2 hover:bg-stone-50 active:scale-[0.99] transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-stone-600">{key}</div>
                      <div className="text-xs text-stone-500">
                        {r.mood != null ? `${r.mood}/10` : "—"}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-stone-900">{previewText(r)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>
      </GlassPanel>
    </div>
  );
}
