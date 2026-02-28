import { useEffect, useMemo, useRef, useState } from "react";
import Section from "../../shared/ui/Section";
import { getWeeklyAnalytics } from "./analytics.api";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Pastel palette (soft, varied)
const PIE_COLORS = [
  "#BEE3F8",
  "#C4B5FD",
  "#FBCFE8",
  "#BBF7D0",
  "#FDE68A",
  "#FED7AA",
  "#A7F3D0",
  "#DDD6FE",
];

function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

function addDays(ymd, delta) {
  const d = new Date(ymd + "T00:00:00");
  d.setDate(d.getDate() + delta);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(null);

  // Micro-interaction state
  const [pulse, setPulse] = useState(false);
  const prevPercentRef = useRef(null);

  async function load(nextWeekStart) {
    const res = await getWeeklyAnalytics({ weekStart: nextWeekStart });
    setData(res);
    setWeekStart(res?.week?.start ?? nextWeekStart ?? null);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load(undefined);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const habitsPie = useMemo(() => {
    const habits = data?.habits ?? [];
    const total = habits.reduce((acc, h) => acc + Number(h.checkins ?? 0), 0);

    return habits.map((h) => ({
      name: h.name,
      value: Number(h.checkins ?? 0),
      checkins: Number(h.checkins ?? 0),
      total,
    }));
  }, [data]);

  const tasksBar = useMemo(() => {
    const created = Number(data?.tasks?.created ?? 0);
    const completed = Number(data?.tasks?.completed ?? 0);
    const percent =
      created > 0 ? Math.min(100, Math.round((completed / created) * 100)) : 0;

    return { created, completed, percent };
  }, [data]);

  useEffect(() => {
    const prev = prevPercentRef.current;
    const next = tasksBar.percent;

    if (prev === null || prev === undefined) {
      prevPercentRef.current = next;
      return;
    }

    if (prev !== next) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 420);
      prevPercentRef.current = next;
      return () => clearTimeout(t);
    }
  }, [tasksBar.percent]);

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  const week = data?.week;
  const title = week ? `${week.start} → ${week.end}` : "This week";

  return (
    <div className="space-y-8">
      <GlassPanel>
        <Section title="Analytics" subtitle="A soft recap of your week.">
          {/* Week picker */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm">
            <div>
              <div className="text-sm font-medium text-stone-900">{title}</div>
              <div className="mt-1 text-xs text-stone-500">
                Timezone: {week?.timeZone ?? "—"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => load(addDays(weekStart, -7))}
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition"
                disabled={!weekStart}
              >
                ← Prev week
              </button>
              <button
                type="button"
                onClick={() => load(addDays(weekStart, 7))}
                className="rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition"
                disabled={!weekStart}
              >
                Next week →
              </button>
            </div>
          </div>

          {/* Gentle recap */}
          <div className="mt-4 rounded-2xl bg-emerald-50/70 p-4 text-sm text-emerald-900 border border-emerald-100">
            {data?.gentleRecap ?? "A small recap will appear here."}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Habits pie */}
            <div className="rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm transition hover:-translate-y-[1px] hover:shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-stone-900">Habits</div>
                <div className="text-xs text-stone-500">Share of check-ins</div>
              </div>

              {habitsPie.length === 0 ? (
                <div className="mt-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
                  No habit check-ins tracked this week yet.
                </div>
              ) : (
                <div className="mt-3 grid gap-4 sm:grid-cols-2 items-center">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={habitsPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={2}
                          isAnimationActive={true}
                          label={false}
                        >
                          {habitsPie.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
                  <div className="space-y-2">
                    {habitsPie.map((h, idx) => (
                      <div key={h.name} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 rounded-full border border-white/60"
                            style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                          />
                          <div className="text-sm text-stone-800 truncate">{h.name}</div>
                        </div>

                        <div className="text-xs text-stone-500">{h.checkins}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tasks */}
            <div className="rounded-2xl border border-black/5 bg-white/55 p-4 backdrop-blur-sm transition hover:-translate-y-[1px] hover:shadow-sm">
              <div className="text-sm font-medium text-stone-900">Tasks</div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-black/5 bg-emerald-50/70 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                  <div className="text-xs text-emerald-800">Created</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-900">
                    {tasksBar.created}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 bg-sky-50/70 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                  <div className="text-xs text-sky-800">Completed</div>
                  <div className="mt-1 text-lg font-semibold text-sky-900">
                    {tasksBar.completed}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/5 bg-rose-50/70 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                  <div className="text-xs text-rose-800">Overdue</div>
                  <div className="mt-1 text-lg font-semibold text-rose-900">
                    {Number(data?.tasks?.overdueEndOfWeek ?? 0)}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Completion rate</span>

                  <span
                    className={`text-stone-700 font-medium inline-flex items-center gap-1 transition ${
                      pulse ? "scale-[1.06]" : "scale-100"
                    }`}
                  >
                    {tasksBar.percent}%{pulse ? <span className="text-[11px]">✨</span> : null}
                  </span>
                </div>

                <div className="mt-2 h-3 rounded-full bg-stone-100 overflow-hidden border border-black/5">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                      pulse ? "brightness-[1.03]" : ""
                    }`}
                    style={{
                      width: `${tasksBar.percent}%`,
                      background:
                        "linear-gradient(90deg, #DFF5E6, #D9F0FF, #EFE4FF, #FFE0EB)",
                    }}
                  />
                </div>

                <div className="mt-2 text-xs text-stone-500">
                  {tasksBar.created > 0
                    ? `${tasksBar.completed} of ${tasksBar.created} finished`
                    : "No tasks created this week yet."}
                </div>
              </div>
            </div>
          </div>

{/* Weekly reflections strip + Notifications */}
<div className="mt-4 grid gap-4 lg:grid-cols-2">
  {/* Weekly reflections (7-day mood strip) */}
  <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-stone-900">Reflections</div>
        <div className="mt-1 text-xs text-stone-500">
          {Array.isArray(data?.reflections) ? data.reflections.length : 0} entries this week
          {" • "}
          Avg mood:{" "}
          {(() => {
            const list = Array.isArray(data?.reflections) ? data.reflections : [];
            const moods = list
              .map((r) => Number(r?.mood))
              .filter((m) => Number.isFinite(m));
            if (!moods.length) return "—";
            const avg = Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10;
            return avg;
          })()}
        </div>
      </div>

      <div className="text-xs text-stone-500">Mon → Sun</div>
    </div>

    {(() => {
      const weekStart = data?.week?.start; // YYYY-MM-DD (Monday)
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

      const addDays = (ymd, delta) => {
        const d = new Date(ymd + "T00:00:00");
        d.setDate(d.getDate() + delta);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      };

      const moodToPastel = (mood) => {
        const m = Number(mood);
        if (!Number.isFinite(m)) return null;

        const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
        const lerp = (a, b, t) => a + (b - a) * t;
        const mix = (c1, c2, t) => ({
          r: Math.round(lerp(c1.r, c2.r, t)),
          g: Math.round(lerp(c1.g, c2.g, t)),
          b: Math.round(lerp(c1.b, c2.b, t)),
        });
        const css = (c) => `rgb(${c.r}, ${c.g}, ${c.b})`;

        const MOOD_LOW = { r: 186, g: 224, b: 255 }; // blue
        const MOOD_MID = { r: 210, g: 190, b: 255 }; // purple
        const MOOD_HIGH = { r: 255, g: 200, b: 225 }; // pink

        const x = clamp(m, 1, 10);
        if (x <= 6) return css(mix(MOOD_LOW, MOOD_MID, (x - 1) / 5));
        return css(mix(MOOD_MID, MOOD_HIGH, (x - 6) / 4));
      };

      const list = Array.isArray(data?.reflections) ? data.reflections : [];

      const findByDate = (ymd) => {
        return list.find((r) => String(r?.reflect_date ?? "").slice(0, 10) === ymd) ?? null;
      };

      // If weekStart missing, show a gentle fallback (still pretty)
      if (!weekStart) {
        return (
          <div className="mt-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
            Week range not available yet.
          </div>
        );
      }

      return (
        <div className="mt-3 grid grid-cols-7 gap-2">
          {labels.map((label, i) => {
            const ymd = addDays(weekStart, i);
            const ref = findByDate(ymd);
            const mood = ref?.mood != null ? Number(ref.mood) : null;
            const bg = mood != null ? moodToPastel(mood) : "rgba(255,255,255,0.7)";

            return (
              <div
                key={label}
                className="rounded-2xl border border-black/10 px-2 py-2 text-center"
                style={{
                  backgroundColor: bg,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
                }}
                title={
                  ref
                    ? `${ymd} — mood ${mood}/10`
                    : `${ymd} — no reflection`
                }
              >
                <div className="text-[10px] text-stone-700">{label}</div>
                <div className={`mt-0.5 text-xs ${mood != null ? "text-stone-900" : "text-stone-500"}`}>
                  {mood != null ? mood : "—"}
                </div>

                {/* tiny dot indicator if there's a reflection */}
                <div className="mt-1 flex justify-center">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      ref ? "bg-stone-700/60" : "bg-stone-400/30"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    })()}
  </div>

  {/* Notifications */}
  <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
    <div className="text-sm font-medium text-stone-900">Notifications</div>
    <div className="mt-2 text-xs text-stone-600">
      Sent: <span className="text-stone-800">{data?.push?.sent ?? 0}</span> • Failed:{" "}
      <span className="text-stone-800">{data?.push?.failed ?? 0}</span> • Skipped:{" "}
      <span className="text-stone-800">{data?.push?.skipped ?? 0}</span>
    </div>
  </div>
</div>

  {/* Notifications */}
  <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
    <div className="text-sm font-medium text-stone-900">Notifications</div>
    <div className="mt-2 text-xs text-stone-600">
      Sent: <span className="text-stone-800">{data?.push?.sent ?? 0}</span> • Failed:{" "}
      <span className="text-stone-800">{data?.push?.failed ?? 0}</span> • Skipped:{" "}
      <span className="text-stone-800">{data?.push?.skipped ?? 0}</span>
    </div>
  </div>
</div>
          
        </Section>
      </GlassPanel>
    </div>
  );
}
