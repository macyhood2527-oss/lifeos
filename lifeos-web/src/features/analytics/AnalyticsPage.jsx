import { useEffect, useMemo, useRef, useState } from "react";
import Section from "../../shared/ui/Section";
import { getWeeklyAnalytics } from "./analytics.api";

// ✅ adjust path if yours differs
import { listReflections } from "../reflections/reflections.api";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  CartesianGrid,
} from "recharts";

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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function ymdFromAny(x) {
  return String(x ?? "").slice(0, 10);
}

function isBetweenInclusive(ymd, start, end) {
  if (!ymd || !start || !end) return false;
  return ymd >= start && ymd <= end;
}

function weekdayLabelFromIndex(i) {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i] ?? "";
}

function buildMoodInsight(series) {
  const vals = series.map((p) => p.mood).filter((m) => Number.isFinite(m));
  if (vals.length === 0) return "No mood logs yet — add one in Reflections when you’re ready.";
  if (vals.length === 1) return "One mood log this week — a tiny start counts.";

  const withMood = series.filter((p) => Number.isFinite(p.mood));
  if (withMood.length < 2) return "Not enough mood logs to spot a trend yet.";

  const mids = Math.floor(withMood.length / 2);
  const early = withMood.slice(0, mids).map((p) => p.mood);
  const late = withMood.slice(mids).map((p) => p.mood);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const a1 = avg(early);
  const a2 = avg(late);
  const diff = a2 - a1;

  if (Math.abs(diff) < 0.35) return "Mood stayed fairly steady — gentle consistency.";
  if (diff >= 0.35 && diff < 1.25) return "Mood nudged upward — small wins, gently.";
  if (diff >= 1.25) return "Mood rose noticeably — you’re finding your rhythm.";
  if (diff <= -0.35 && diff > -1.25) return "Mood dipped a little — consider a softer pace this week.";
  return "Mood dipped noticeably — be extra kind to yourself.";
}

/* =========================
   Seeded rotation helpers
========================= */
function hashStringToInt(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str || "").length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makePicker(seedStr) {
  let seed = hashStringToInt(seedStr || "lifeos");
  return function pick(arr) {
    if (!arr?.length) return "";
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    const idx = Math.abs(seed) % arr.length;
    return arr[idx];
  };
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
}

function getTrendLabel(moodSeries) {
  const vals = moodSeries.map((p) => p.mood).filter((m) => Number.isFinite(m));
  if (vals.length < 2) return null;

  const mid = Math.floor(vals.length / 2);
  const early = vals.slice(0, mid);
  const late = vals.slice(mid);
  const diff = avg(late) - avg(early);

  if (diff > 0.5) return "up";
  if (diff < -0.5) return "down";
  return "steady";
}

function getPeakDay(moodSeries) {
  let best = null;
  for (const p of moodSeries) {
    if (!Number.isFinite(p.mood)) continue;
    if (!best || p.mood > best.mood) best = p;
  }
  return best;
}

function buildWeeklyInsight({ weekKey, moodStats, moodSeries, tasksBar, habitsPie }) {
  const pick = makePicker(weekKey);

  const moodAvg = moodStats?.avg;
  const moodCount = moodStats?.count ?? 0;
  const completion = tasksBar?.percent ?? 0;
  const habitTotal = (habitsPie || []).reduce((a, h) => a + Number(h.checkins || 0), 0);

  const trend = getTrendLabel(moodSeries);
  const peak = getPeakDay(moodSeries);

  const s = [];

  // 1) opener
  if (!Number.isFinite(moodAvg)) {
    s.push(
      pick([
        "This week didn’t leave much of a mood trail — and that’s okay.",
        "Quiet week on mood logs — no pressure.",
        "Not much mood data this week, but we can still reflect gently.",
      ])
    );
  } else if (moodAvg >= 7.5) {
    s.push(
      pick([
        "You moved through this week with noticeably lighter energy.",
        "This week carried a brighter tone overall.",
        "Your energy felt strong and steady this week.",
      ])
    );
  } else if (moodAvg >= 6) {
    s.push(
      pick([
        "Your mood felt fairly balanced across the week.",
        "This week looked like a mix — but mostly steady.",
        "You held a gentle, workable rhythm this week.",
      ])
    );
  } else {
    s.push(
      pick([
        "This week felt a bit heavier emotionally.",
        "Energy looked lower this week — it happens.",
        "This week asked more from you than usual.",
      ])
    );
  }

  // 2) mood detail + pattern
  if (Number.isFinite(moodAvg) && moodCount > 0) {
    s.push(
      pick([
        `Your average mood landed around ${moodAvg}/10.`,
        `Mood average came out to about ${moodAvg}/10.`,
        `Across your logs, mood averaged ${moodAvg}/10.`,
      ])
    );

    if (trend === "up") {
      s.push(
        pick([
          "It trended upward as the week went on — a soft lift.",
          "Your mood gently climbed toward the end of the week.",
          "There was a quiet upward drift in your mood.",
        ])
      );
    } else if (trend === "down") {
      s.push(
        pick([
          "It dipped as the days progressed — consider a softer pace.",
          "Mood slid downward later in the week — you might need recovery time.",
          "There was a downward pull near the end of the week.",
        ])
      );
    } else if (trend === "steady") {
      s.push(
        pick([
          "It stayed fairly consistent — gentle stability.",
          "Mood held steady without big swings.",
          "Your mood line stayed relatively even.",
        ])
      );
    }

    if (peak) {
      s.push(
        pick([
          `${peak.day} stood out as your brightest day.`,
          `Your best mood day was ${peak.day}.`,
          `${peak.day} looked like your high point.`,
        ])
      );
    }
  } else {
    s.push(
      pick([
        "If you log even once or twice next week, patterns will start showing up.",
        "A couple of mood logs next week will help this feel more personal.",
        "Even a tiny check-in next week gives the chart more meaning.",
      ])
    );
  }

  // 3) tasks follow-through
  if (completion >= 80) {
    s.push(
      pick([
        `You followed through on most of your tasks (${completion}%).`,
        `Task completion was strong at ${completion}%.`,
        `You showed real follow-through — ${completion}% completed.`,
      ])
    );
  } else if (completion >= 55) {
    s.push(
      pick([
        `You made steady progress on tasks (${completion}% done).`,
        `Tasks moved forward at a steady pace (${completion}%).`,
        `You kept things moving — ${completion}% completed.`,
      ])
    );
  } else if (completion > 0) {
    s.push(
      pick([
        `Tasks slowed down this week (${completion}% completed).`,
        `You did what you could — completion was ${completion}%.`,
        `Progress was lighter this week (${completion}%).`,
      ])
    );
  } else {
    s.push(
      pick([
        "Tasks were quiet this week — not every week is for output.",
        "Task completion didn’t register this week — could be a reset week.",
        "No tasks finished this week — maybe your focus was elsewhere.",
      ])
    );
  }

  // 4) habits consistency
  if (habitTotal >= 7) {
    s.push(
      pick([
        "Habits were very consistent — small repetitions are stacking.",
        "Your habit check-ins stayed strong — that’s quiet momentum.",
        "You showed up for your habits a lot this week.",
      ])
    );
  } else if (habitTotal >= 3) {
    s.push(
      pick([
        "You kept a few habits going — that still counts.",
        "Habits showed up a handful of times — good signal.",
        "There’s a small consistency thread in your habits.",
      ])
    );
  } else if (habitTotal > 0) {
    s.push(
      pick([
        "Habits were light, but you still showed up at least once.",
        "Even one habit check-in is proof you didn’t quit.",
        "A small habit check-in is still a win.",
      ])
    );
  } else {
    s.push(
      pick([
        "Habits were quiet this week — consider choosing one easy anchor habit.",
        "No habit check-ins logged — maybe keep it gentler next week.",
        "No habit logs — a single tiny habit next week could change the feel.",
      ])
    );
  }

  // 5) gentle close
  s.push(
    pick([
      "Next week: keep it simple. One small habit + one meaningful task is enough.",
      "If the week felt messy, don’t fix everything — just choose one gentle priority.",
      "You’re building awareness, not perfection. That’s the real win.",
      "Try a softer start next week, then build up once energy returns.",
      "If you want, aim for one small “anchor” next week — something easy to keep.",
    ])
  );

  // 4–6 sentences (cap so it doesn’t feel too long)
  return s.filter(Boolean).slice(0, 6).join(" ");
}

/* =========================
   Cute tooltip
========================= */
function MoodTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const v = payload[0]?.value;
  const ymd = payload[0]?.payload?.ymd;

  const mood = Number.isFinite(Number(v)) ? Number(v) : null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="text-stone-900 font-medium">{label}</div>
      <div className="text-stone-500">{ymd}</div>
      <div className="mt-1 text-stone-800">
        Mood:{" "}
        <span className="font-semibold">
          {mood != null ? `${mood}/10` : "—"}
        </span>
      </div>
    </div>
  );
}

/* =========================
   Hollow dots like SaaS charts
========================= */
function MoodDot({ cx, cy, payload, stroke }) {
  if (!payload || payload.mood == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.5}
      fill="#fff"
      stroke={stroke || "rgba(0,0,0,0.25)"}
      strokeWidth={2}
    />
  );
}

function MoodActiveDot({ cx, cy, stroke }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill="#fff"
      stroke={stroke || "rgba(0,0,0,0.35)"}
      strokeWidth={2.5}
      style={{ filter: "drop-shadow(0px 6px 10px rgba(0,0,0,0.10))" }}
    />
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(null);

  const [allReflections, setAllReflections] = useState([]);

  // Micro-interaction state
  const [pulse, setPulse] = useState(false);
  const prevPercentRef = useRef(null);

  async function load(nextWeekStart) {
    const res = await getWeeklyAnalytics({ weekStart: nextWeekStart });
    setData(res);
    setWeekStart(res?.week?.start ?? nextWeekStart ?? null);

    // ✅ secondary fetch (no backend change)
    const list = await listReflections({ limit: 120 }).catch(() => []);

    // ✅ support both: array OR { reflections: [...] }
    const arr = Array.isArray(list)
      ? list
      : Array.isArray(list?.reflections)
      ? list.reflections
      : [];

    setAllReflections(arr);
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
    const percent = created > 0 ? Math.min(100, Math.round((completed / created) * 100)) : 0;
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

  // ✅ Build 7-day mood series (Mon→Sun) for current week
  const moodSeries = useMemo(() => {
    const start = data?.week?.start;
    const end = data?.week?.end;
    if (!start || !end) return [];

    const map = new Map();
    for (const r of Array.isArray(allReflections) ? allReflections : []) {
      const ymd = ymdFromAny(r.reflect_date);
      if (!isBetweenInclusive(ymd, start, end)) continue;

      const mood = Number(r.mood);
      if (Number.isFinite(mood)) map.set(ymd, clamp(mood, 1, 10));
    }

    return Array.from({ length: 7 }).map((_, i) => {
      const ymd = addDays(start, i);
      const mood = map.has(ymd) ? map.get(ymd) : null;
      return { day: weekdayLabelFromIndex(i), ymd, mood };
    });
  }, [data?.week?.start, data?.week?.end, allReflections]);

  const moodStats = useMemo(() => {
    const moods = moodSeries.map((d) => d.mood).filter((m) => Number.isFinite(m));
    const count = moods.length;
    const avg = count ? Math.round((moods.reduce((a, b) => a + b, 0) / count) * 10) / 10 : null;
    const insight = buildMoodInsight(moodSeries);
    return { count, avg, insight };
  }, [moodSeries]);

  const weeklyInsight = useMemo(() => {
    const key = data?.week?.start || "week";
    return buildWeeklyInsight({
      weekKey: key,
      moodStats,
      moodSeries,
      tasksBar,
      habitsPie,
    });
  }, [data?.week?.start, moodStats, moodSeries, tasksBar, habitsPie]);

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
                          <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

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
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="text-sm font-medium text-stone-900">Tasks</div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-black/5 bg-emerald-50 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                <div className="text-xs text-emerald-800">Created</div>
                <div className="mt-1 text-lg font-semibold text-emerald-900">{tasksBar.created}</div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-sky-50 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
                <div className="text-xs text-sky-800">Completed</div>
                <div className="mt-1 text-lg font-semibold text-sky-900">{tasksBar.completed}</div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-rose-50 p-3 transition hover:-translate-y-[1px] hover:shadow-sm">
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
                  {tasksBar.percent}% {pulse ? <span className="text-[11px]">✨</span> : null}
                </span>
              </div>

              <div className="mt-2 h-3 rounded-full bg-stone-100 overflow-hidden border border-black/5">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                    pulse ? "brightness-[1.03]" : ""
                  }`}
                  style={{
                    width: `${tasksBar.percent}%`,
                    background: "linear-gradient(90deg, #DFF5E6, #D9F0FF, #EFE4FF, #FFE0EB)",
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

        {/* Bottom row */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* 🌈 Mood Trend */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-900">Mood trend</div>
                <div className="mt-1 text-xs text-stone-500">
                  {moodStats.count} logs this week • Avg mood: {moodStats.avg ?? "—"}
                </div>
              </div>
              <div className="text-[11px] text-stone-500">Mon → Sun</div>
            </div>

            <div className="mt-3 h-40 rounded-2xl border border-black/5 bg-white/35 p-2">
              {moodSeries.every((d) => d.mood == null) ? (
                <div className="h-full flex items-center justify-center text-sm text-stone-500">
                  No mood logs yet — add one in Reflections 🌿
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodSeries} margin={{ top: 14, right: 14, bottom: 6, left: 0 }}>
                    <defs>
                      {/* pastel gradient line */}
                      <linearGradient id="moodLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#BEE3F8" />
                        <stop offset="55%" stopColor="#C4B5FD" />
                        <stop offset="100%" stopColor="#FBCFE8" />
                      </linearGradient>

                      {/* soft area fill */}
                      <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.38" />
                        <stop offset="55%" stopColor="#FBCFE8" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0.06" />
                      </linearGradient>
                    </defs>

                    {/* minimal horizontal grid like the reference */}
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />

                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis domain={[1, 10]} hide />

                    <Tooltip content={<MoodTooltip />} cursor={{ stroke: "rgba(0,0,0,0.06)" }} />

                    {/* area */}
                    <Area
                      type="monotone"
                      dataKey="mood"
                      stroke="none"
                      fill="url(#moodFill)"
                      fillOpacity={1}
                      connectNulls={false}
                      baseValue={1}
                      isAnimationActive={true}
                    />

                    {/* gradient line + hollow dots */}
                    <Line
                      type="monotone"
                      dataKey="mood"
                      connectNulls={false}
                      stroke="url(#moodLine)"
                      strokeWidth={3}
                      dot={<MoodDot />}
                      activeDot={<MoodActiveDot />}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-3 rounded-2xl bg-stone-50/70 p-3 text-sm text-stone-700">
              {moodStats.insight}
            </div>
          </div>

          {/* ✨ Weekly Insight (replaces Notifications) */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-900">Weekly insight</div>
                <div className="mt-1 text-xs text-stone-500">A tiny reflection based on your week.</div>
              </div>
              <div className="text-[11px] text-stone-500">✨</div>
            </div>

            <div className="mt-3 rounded-2xl bg-stone-50/70 p-3 text-sm text-stone-700 leading-relaxed">
              {weeklyInsight}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-stone-500">
              <span className="rounded-full border border-black/5 bg-white/70 px-2 py-1">
                Mood avg: {moodStats.avg ?? "—"}
              </span>
              <span className="rounded-full border border-black/5 bg-white/70 px-2 py-1">
                Tasks: {tasksBar.percent}%
              </span>
              <span className="rounded-full border border-black/5 bg-white/70 px-2 py-1">
                Habit check-ins: {habitsPie.reduce((a, h) => a + Number(h.checkins || 0), 0)}
              </span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
