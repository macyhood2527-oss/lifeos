import { useEffect, useMemo, useRef, useState } from "react";
import Section from "../../shared/ui/Section";
import { getWeeklyAnalytics } from "./analytics.api";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// Pastel palette (soft, varied)
const PIE_COLORS = [
  "#BEE3F8", // pastel blue
  "#C4B5FD", // pastel purple
  "#FBCFE8", // pastel pink
  "#BBF7D0", // pastel green
  "#FDE68A", // pastel yellow
  "#FED7AA", // pastel peach
  "#A7F3D0", // mint
  "#DDD6FE", // lavender
];

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
  const [weekStart, setWeekStart] = useState(null); // YYYY-MM-DD (Monday)

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

    // “share of check-ins this week” per habit (visual only)
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

  // 🔔 Trigger a gentle micro-interaction when percent changes
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
      <Section title="Analytics" subtitle="A soft recap of your week.">
        {/* Week picker */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 p-4">
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
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition"
              disabled={!weekStart}
            >
              ← Prev week
            </button>
            <button
              type="button"
              onClick={() => load(addDays(weekStart, 7))}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition"
              disabled={!weekStart}
            >
              Next week →
            </button>
          </div>
        </div>

        {/* Gentle recap */}
        <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          {data?.gentleRecap ?? "A small recap will appear here."}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Habits pie */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
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
                          <Cell
                            key={idx}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      {/* no tooltip (no numbers) */}
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                  {habitsPie.map((h, idx) => (
                    <div
                      key={h.name}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-3 w-3 rounded-full border border-white/60"
                          style={{
                            backgroundColor:
                              PIE_COLORS[idx % PIE_COLORS.length],
                          }}
                        />
                        <div className="text-sm text-stone-800 truncate">
                          {h.name}
                        </div>
                      </div>

                      <div className="text-xs text-stone-500">{h.checkins}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-sm font-medium text-stone-900">Tasks</div>

            {/* Flow cards */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-black/5 bg-emerald-50 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                <div className="text-xs text-emerald-800">Created</div>
                <div className="mt-1 text-lg font-semibold text-emerald-900">
                  {tasksBar.created}
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-sky-50 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                <div className="text-xs text-sky-800">Completed</div>
                <div className="mt-1 text-lg font-semibold text-sky-900">
                  {tasksBar.completed}
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-rose-50 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                <div className="text-xs text-rose-800">Overdue</div>
                <div className="mt-1 text-lg font-semibold text-rose-900">
                  {Number(data?.tasks?.overdueEndOfWeek ?? 0)}
                </div>
              </div>
            </div>

            {/* Completion rate bar + micro interaction */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-stone-600">
                <span>Completion rate</span>

                <span
                  className={`text-stone-700 font-medium inline-flex items-center gap-1 transition ${
                    pulse ? "scale-[1.06]" : "scale-100"
                  }`}
                >
                  {tasksBar.percent}%
                  {pulse ? <span className="text-[11px]">✨</span> : null}
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

        {/* Small extra cards */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-sm font-medium text-stone-900">Reflections</div>
            <div className="mt-2 text-sm text-stone-800">
              {data?.reflections?.count ?? 0} entries this week
            </div>
            <div className="mt-1 text-xs text-stone-500">
              Avg mood: {data?.reflections?.avgMood ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-sm font-medium text-stone-900">Notifications</div>
            <div className="mt-2 text-xs text-stone-600">
              Sent:{" "}
              <span className="text-stone-800">{data?.push?.sent ?? 0}</span>{" "}
              • Failed:{" "}
              <span className="text-stone-800">{data?.push?.failed ?? 0}</span>{" "}
              • Skipped:{" "}
              <span className="text-stone-800">{data?.push?.skipped ?? 0}</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}