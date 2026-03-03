import { useEffect, useMemo, useRef, useState } from "react";
import Section from "../../shared/ui/Section";
import { getWeeklyAnalytics } from "./analytics.api";
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
  ReferenceDot,
  CartesianGrid,
} from "recharts";

/* =========================
   Pastel Palette
========================= */
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

/* =========================
   Utilities
========================= */
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

/* =========================
   Mood Insight Generator
========================= */
function buildMoodInsight(series) {
  const vals = series.map((p) => p.mood).filter((m) => Number.isFinite(m));
  if (vals.length === 0)
    return "No mood logs yet — add one in Reflections when you’re ready.";

  if (vals.length === 1)
    return "One mood log this week — a tiny start counts.";

  const withMood = series.filter((p) => Number.isFinite(p.mood));
  if (withMood.length < 2)
    return "Not enough mood logs to spot a trend yet.";

  const mids = Math.floor(withMood.length / 2);
  const early = withMood.slice(0, mids).map((p) => p.mood);
  const late = withMood.slice(mids).map((p) => p.mood);

  const avg = (arr) =>
    arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);

  const diff = avg(late) - avg(early);

  if (Math.abs(diff) < 0.35)
    return "Mood stayed fairly steady — gentle consistency.";
  if (diff >= 0.35 && diff < 1.25)
    return "Mood nudged upward — small wins, gently.";
  if (diff >= 1.25)
    return "Mood rose noticeably — you’re finding your rhythm.";
  if (diff <= -0.35 && diff > -1.25)
    return "Mood dipped a little — consider a softer pace this week.";

  return "Mood dipped noticeably — be extra kind to yourself.";
}

/* =========================
   Custom Dots
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

/* =========================
   Tooltip
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
   Component
========================= */
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [allReflections, setAllReflections] = useState([]);

  async function load(nextWeekStart) {
    const res = await getWeeklyAnalytics({ weekStart: nextWeekStart });
    setData(res);
    setWeekStart(res?.week?.start ?? nextWeekStart ?? null);

    const list = await listReflections({ limit: 120 }).catch(() => []);
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
    return () => (alive = false);
  }, []);

  const moodSeries = useMemo(() => {
    const start = data?.week?.start;
    const end = data?.week?.end;
    if (!start || !end) return [];

    const map = new Map();

    for (const r of allReflections) {
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
    const moods = moodSeries
      .map((d) => d.mood)
      .filter((m) => Number.isFinite(m));

    const count = moods.length;
    const avg = count
      ? Math.round(
          (moods.reduce((a, b) => a + b, 0) / count) * 10
        ) / 10
      : null;

    return { count, avg, insight: buildMoodInsight(moodSeries) };
  }, [moodSeries]);

  if (loading)
    return <div className="text-stone-500">Loading gently...</div>;

  return (
    <div className="space-y-8">
      <Section title="Analytics" subtitle="A soft recap of your week.">
        {/* Mood Trend Card */}
        <div className="rounded-2xl border border-black/5 bg-white/70 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-stone-900">
                Mood trend
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {moodStats.count} logs • Avg mood: {moodStats.avg ?? "—"}
              </div>
            </div>
            <div className="text-[11px] text-stone-500">
              Mon → Sun
            </div>
          </div>

          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={moodSeries}
                margin={{ top: 20, right: 20, bottom: 10, left: 0 }}
              >
                <defs>
                  <linearGradient id="moodLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#BEE3F8" />
                    <stop offset="55%" stopColor="#C4B5FD" />
                    <stop offset="100%" stopColor="#FBCFE8" />
                  </linearGradient>

                  <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="#C4B5FD"
                      stopOpacity={0.28}
                    />
                    <stop
                      offset="100%"
                      stopColor="#FBCFE8"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="rgba(0,0,0,0.05)"
                />

                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />

                <YAxis
                  domain={[1, 10]}
                  hide
                />

                <Tooltip
                  content={<MoodTooltip />}
                  cursor={{ stroke: "rgba(0,0,0,0.06)" }}
                />

                <Area
                  type="monotone"
                  dataKey="mood"
                  stroke="none"
                  fill="url(#moodFill)"
                  connectNulls={false}
                />

                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="url(#moodLine)"
                  strokeWidth={3}
                  dot={<MoodDot />}
                  activeDot={<MoodActiveDot />}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 rounded-2xl bg-stone-50/80 p-4 text-sm text-stone-700">
            {moodStats.insight}
          </div>
        </div>
      </Section>
    </div>
  );
}
