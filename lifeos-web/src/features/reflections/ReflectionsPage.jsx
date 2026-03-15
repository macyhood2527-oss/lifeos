import { useEffect, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Section from "../../shared/ui/Section";
import ReflectionComposer from "./components/ReflectionComposer";
import { getTodayReflection } from "../today/today.api";
import { listReflections, upsertReflectionByDate } from "./reflections.api";
import { Icons } from "../../config/icons";

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

function EmptyReflectionState() {
  return (
    <div className="rounded-2xl border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(245,241,255,0.88))] p-5">
      <div className="text-sm font-medium text-stone-900">Your reflection history starts with one honest note.</div>
      <p className="mt-1 text-sm text-stone-600">
        You do not need a perfect journal entry. A mood, one bright spot, or one hard thing is already enough to begin seeing patterns.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1 text-violet-900">Start with mood only</span>
        <span className="rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-emerald-900">One sentence is enough</span>
        <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-stone-700">Insights get better over time</span>
      </div>
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

function hasReflectionContent(r) {
  if (!r) return false;
  return (
    r?.mood != null ||
    Boolean(String(r?.gratitude ?? "").trim()) ||
    Boolean(String(r?.highlights ?? "").trim()) ||
    Boolean(String(r?.challenges ?? "").trim()) ||
    Boolean(String(r?.notes ?? "").trim())
  );
}

function addDaysYMD(ymd, delta) {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return ymdLocal(d);
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

function isYMD(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

export default function ReflectionsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get("date");
  const initialYMD = isYMD(queryDate) ? queryDate : ymdLocal(new Date());

  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(initialYMD + "T00:00:00");
    return startOfMonth(d);
  });
  const [selectedYMD, setSelectedYMD] = useState(initialYMD);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [todayQuery, allQuery] = useQueries({
    queries: [
      { queryKey: ["reflection", "today"], queryFn: () => getTodayReflection() },
      { queryKey: ["reflections", "list"], queryFn: () => listReflections({ limit: 120 }) },
    ],
  });
  const loading = todayQuery.isLoading || allQuery.isLoading;
  const today = todayQuery.data ?? null;
  const all = allQuery.data ?? [];

  useEffect(() => {
    if (!isYMD(queryDate)) return;
    setSelectedYMD(queryDate);
    setViewDate(startOfMonth(new Date(queryDate + "T00:00:00")));
  }, [queryDate]);

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
  const isTodaySelected = selectedYMD === todayYMD;
  const recentAll = useMemo(
    () => (Array.isArray(all) ? all : []).slice(0, 120),
    [all]
  );
  const recentCollapsedCount = 8;
  const shouldCollapseRecent = recentAll.length > recentCollapsedCount;
  const recentVisible = useMemo(
    () =>
      showAllRecent || !shouldCollapseRecent
        ? recentAll
        : recentAll.slice(0, recentCollapsedCount),
    [recentAll, showAllRecent, shouldCollapseRecent]
  );

  const monthCells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const weekLabels = useMemo(() => weekdayShortLabels(), []);
  const insightToday = useMemo(() => new Date(), []);
  const monthStartYMD = useMemo(() => ymdLocal(startOfMonth(insightToday)), [insightToday]);
  const monthEndYMD = useMemo(() => ymdLocal(endOfMonth(insightToday)), [insightToday]);

  const monthEntries = useMemo(() => {
    return (Array.isArray(all) ? all : []).filter((r) => {
      const ymd = String(r?.reflect_date ?? "").slice(0, 10);
      return ymd && ymd >= monthStartYMD && ymd <= monthEndYMD;
    });
  }, [all, monthStartYMD, monthEndYMD]);

  const monthAvgMood = useMemo(() => {
    const moods = monthEntries
      .map((r) => Number(r?.mood))
      .filter((m) => Number.isFinite(m));
    if (!moods.length) return null;
    return Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10;
  }, [monthEntries]);

  const streak = useMemo(() => {
    let s = 0;
    let cur = todayYMD;
    while (hasReflectionContent(byDate.get(cur))) {
      s += 1;
      cur = addDaysYMD(cur, -1);
    }
    return s;
  }, [byDate, todayYMD]);

  const recentGrouped = useMemo(() => {
    const groups = [];
    let lastKey = null;
    for (const r of recentVisible) {
      const ymd = String(r?.reflect_date ?? "").slice(0, 10);
      const d = new Date(ymd + "T00:00:00");
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== lastKey) {
        groups.push({
          key,
          label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
          items: [],
        });
        lastKey = key;
      }
      groups[groups.length - 1].items.push(r);
    }
    return groups;
  }, [recentVisible]);

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  const hasAnyReflections = Array.isArray(all) && all.length > 0;

  return (
    <div className="space-y-8">
      <GlassPanel>
        <Section title="Reflections" subtitle="Browse your days without clutter." icon={Icons.reflections}>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
              <div className="text-[11px] text-stone-500">Entries this month</div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{monthEntries.length}</div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/60 px-3 py-2">
              <div className="text-[11px] text-violet-700">Avg mood this month</div>
              <div className="mt-1 text-sm font-semibold text-violet-900">
                {monthAvgMood != null ? `${monthAvgMood}/10` : "—"}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
              <div className="text-[11px] text-emerald-700">Current streak</div>
              <div className="mt-1 text-sm font-semibold text-emerald-900">
                {streak} day{streak === 1 ? "" : "s"}
              </div>
            </div>
          </div>

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
                      title={
                        ref?.mood != null
                          ? `${key} — mood ${ref.mood}/10`
                          : key
                      }
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

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-sky-200 bg-sky-100" />
                  Low mood
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-violet-200 bg-violet-100" />
                  Mid mood
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-pink-200 bg-pink-100" />
                  High mood
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-emerald-300" />
                  Selected
                </span>
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
                      : "No reflection yet for this day."}
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

              <div className="mt-3 space-y-3">
                {!hasAnyReflections && !selected ? <EmptyReflectionState /> : null}
                {!isTodaySelected ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    You are editing <span className="font-medium">{selectedYMD}</span>. Saving will
                    update this selected date.
                  </div>
                ) : null}

                <ReflectionComposer
                  initial={isTodaySelected ? today : selected}
                  saveReflection={
                    isTodaySelected
                      ? undefined
                      : (payload) => upsertReflectionByDate(selectedYMD, payload)
                  }
                  onSaved={() =>
                    Promise.all([
                      queryClient.invalidateQueries({ queryKey: ["reflection", "today"] }),
                      queryClient.invalidateQueries({ queryKey: ["reflections", "list"] }),
                    ])
                  }
                />
              </div>
            </div>
          </div>

          {/* Recent list */}
          <div className="mt-4 rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm">
            <div className="text-sm font-medium text-stone-900">Recent</div>
            <div className="mt-2 space-y-3">
              {!hasAnyReflections ? <EmptyReflectionState /> : null}
              {recentGrouped.map((g) => (
                <div key={g.key} className="space-y-2">
                  <div className="sticky top-0 z-10 inline-flex rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-[11px] text-stone-600 backdrop-blur">
                    {g.label}
                  </div>
                  <div className="space-y-2">
                    {g.items.map((r) => {
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
              ))}
            </div>

            {shouldCollapseRecent ? (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllRecent((v) => !v)}
                  className="rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
                >
                  {showAllRecent
                    ? "Show less"
                    : `Show more (${recentAll.length - recentCollapsedCount})`}
                </button>
              </div>
            ) : null}
          </div>
        </Section>
      </GlassPanel>
    </div>
  );
}
