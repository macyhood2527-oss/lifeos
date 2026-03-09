import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "../../shared/ui/Section";
import { getWeeklyAnalytics } from "./analytics.api";

// ✅ adjust path if yours differs
import { listReflections } from "../reflections/reflections.api";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
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

function weekdayShortFromYMD(ymd) {
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function shortMonthDayFromYMD(ymd) {
  const d = new Date(ymd + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ymdNowInTimeZone(tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz || "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
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

  const moodPoint = payload.find((p) => p?.dataKey === "mood") ?? payload[0];
  const v = moodPoint?.value;
  const ymd = moodPoint?.payload?.ymd;
  const isFuture = Boolean(moodPoint?.payload?.isFuture);
  const isMissedPast = Boolean(moodPoint?.payload?.isMissedPast);

  const mood = Number.isFinite(Number(v)) ? Number(v) : null;

  return (
    <div className="rounded-2xl border border-black/10 bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
      <div className="text-stone-900 font-medium">{label}</div>
      <div className="text-stone-500">{ymd}</div>
      <div className="mt-1 text-stone-800">
        {mood != null ? (
          <>
            Mood: <span className="font-semibold">{mood}/10</span>
          </>
        ) : isFuture ? (
          <>Future day</>
        ) : isMissedPast ? (
          <>Missed mood log</>
        ) : (
          <>No mood log</>
        )}
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

function MissingMoodDot({ cx, cy, payload, onPickDate }) {
  if (!payload || !payload.isMissedPast) return null;
  return (
    <g
      onClick={() => onPickDate?.(payload.ymd)}
      style={{ cursor: "pointer" }}
      aria-label={`Backfill mood for ${payload.day}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#fff"
        stroke="rgba(120,120,120,0.45)"
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />
      <line x1={cx - 2.2} y1={cy} x2={cx + 2.2} y2={cy} stroke="rgba(120,120,120,0.45)" strokeWidth={1.2} />
      <line x1={cx} y1={cy - 2.2} x2={cx} y2={cy + 2.2} stroke="rgba(120,120,120,0.45)" strokeWidth={1.2} />
    </g>
  );
}

function FutureMoodDot({ cx, cy, payload }) {
  if (!payload || !payload.isFuture) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4.2}
      fill="rgba(148,163,184,0.14)"
      stroke="rgba(100,116,139,0.35)"
      strokeWidth={1.3}
    />
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [moodRange, setMoodRange] = useState("7d");

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

  // Weekly mood series (used for weekly insight + recap semantics)
  const weeklyMoodSeries = useMemo(() => {
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

  const weeklyMoodStats = useMemo(() => {
    const moods = weeklyMoodSeries.map((d) => d.mood).filter((m) => Number.isFinite(m));
    const count = moods.length;
    const avg = count ? Math.round((moods.reduce((a, b) => a + b, 0) / count) * 10) / 10 : null;
    const insight = buildMoodInsight(weeklyMoodSeries);
    return { count, avg, insight };
  }, [weeklyMoodSeries]);

  const todayYMDInWeekTZ = useMemo(
    () => ymdNowInTimeZone(data?.week?.timeZone),
    [data?.week?.timeZone]
  );

  const moodRangeDays = useMemo(() => {
    if (moodRange === "30d") return 30;
    return 7;
  }, [moodRange]);

  const moodTrendEndYMD = useMemo(() => {
    const weekEnd = data?.week?.end;
    if (!weekEnd) return todayYMDInWeekTZ;
    return weekEnd < todayYMDInWeekTZ ? weekEnd : todayYMDInWeekTZ;
  }, [data?.week?.end, todayYMDInWeekTZ]);

  const moodSeries = useMemo(() => {
    const end = moodTrendEndYMD;
    if (!end) return [];

    const map = new Map();
    for (const r of Array.isArray(allReflections) ? allReflections : []) {
      const ymd = ymdFromAny(r.reflect_date);
      const mood = Number(r.mood);
      if (ymd && Number.isFinite(mood)) map.set(ymd, clamp(mood, 1, 10));
    }

    return Array.from({ length: moodRangeDays }).map((_, idx) => {
      const back = moodRangeDays - 1 - idx;
      const ymd = addDays(end, -back);
      const mood = map.has(ymd) ? map.get(ymd) : null;

      let label = "";
      if (moodRangeDays === 7) {
        label = weekdayShortFromYMD(ymd);
      } else if (idx === 0 || idx === moodRangeDays - 1 || idx % 7 === 0) {
        label = shortMonthDayFromYMD(ymd);
      }

      return { day: label, ymd, mood };
    });
  }, [moodTrendEndYMD, moodRangeDays, allReflections]);

  const moodStats = useMemo(() => {
    const moods = moodSeries.map((d) => d.mood).filter((m) => Number.isFinite(m));
    const count = moods.length;
    const avg = count ? Math.round((moods.reduce((a, b) => a + b, 0) / count) * 10) / 10 : null;
    const insight = buildMoodInsight(moodSeries);
    return { count, avg, insight };
  }, [moodSeries]);

  const missingMoodDays = useMemo(
    () => moodSeries.filter((d) => d.mood == null && d.ymd < todayYMDInWeekTZ),
    [moodSeries, todayYMDInWeekTZ]
  );

  const futureMoodDays = useMemo(
    () => moodSeries.filter((d) => d.mood == null && d.ymd > todayYMDInWeekTZ),
    [moodSeries, todayYMDInWeekTZ]
  );

  const moodSeriesForChart = useMemo(
    () =>
      moodSeries.map((d) => ({
        ...d,
        isMissedPast: d.mood == null && d.ymd < todayYMDInWeekTZ,
        isFuture: d.mood == null && d.ymd > todayYMDInWeekTZ,
        missingMarker: d.mood == null && d.ymd < todayYMDInWeekTZ ? 0.6 : null,
        futureMarker: d.mood == null && d.ymd > todayYMDInWeekTZ ? 0.6 : null,
      })),
    [moodSeries, todayYMDInWeekTZ]
  );

  function goToBackfill(ymd) {
    if (!ymd) return;
    navigate(`/reflections?date=${encodeURIComponent(ymd)}`);
  }

  const weeklyInsight = useMemo(() => {
    const key = data?.week?.start || "week";
    return buildWeeklyInsight({
      weekKey: key,
      moodStats: weeklyMoodStats,
      moodSeries: weeklyMoodSeries,
      tasksBar,
      habitsPie,
    });
  }, [data?.week?.start, weeklyMoodStats, weeklyMoodSeries, tasksBar, habitsPie]);

  const moodTaskCorrelation = useMemo(() => {
    if (!Number.isFinite(weeklyMoodStats.avg)) return "Not enough mood data to compare with tasks yet.";
    if (weeklyMoodStats.count < 3) return "Too few mood logs this week for a strong mood-task pattern.";
    if (tasksBar.created === 0) return "No tasks created this week, so mood-task correlation is limited.";

    if (weeklyMoodStats.avg >= 7 && tasksBar.percent >= 70) return "Higher mood aligned with strong task completion.";
    if (weeklyMoodStats.avg <= 5 && tasksBar.percent < 55) return "Lower mood coincided with lighter task completion.";
    if (weeklyMoodStats.avg >= 7 && tasksBar.percent < 55) return "Mood stayed high, but tasks completion lagged.";
    if (weeklyMoodStats.avg <= 5 && tasksBar.percent >= 70) return "Task completion stayed strong despite lower mood.";
    return "Mood and task completion looked fairly neutral this week.";
  }, [weeklyMoodStats.avg, weeklyMoodStats.count, tasksBar.created, tasksBar.percent]);

  const moodHabitCorrelation = useMemo(() => {
    const habitTotal = habitsPie.reduce((a, h) => a + Number(h.checkins || 0), 0);
    if (!Number.isFinite(weeklyMoodStats.avg)) return "Not enough mood data to compare with habits yet.";
    if (weeklyMoodStats.count < 3) return "Too few mood logs this week for a strong mood-habit pattern.";
    if (habitTotal === 0) return "No habit check-ins this week, so mood-habit correlation is limited.";

    if (weeklyMoodStats.avg >= 7 && habitTotal >= 5) return "Higher mood moved with steady habit consistency.";
    if (weeklyMoodStats.avg <= 5 && habitTotal <= 2) return "Lower mood and lighter habit consistency appeared together.";
    if (weeklyMoodStats.avg >= 7 && habitTotal <= 2) return "Mood stayed high even with few habit check-ins.";
    if (weeklyMoodStats.avg <= 5 && habitTotal >= 5) return "Habit consistency held up despite lower mood.";
    return "Mood and habit consistency looked mixed this week.";
  }, [weeklyMoodStats.avg, weeklyMoodStats.count, habitsPie]);

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
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-900">Tasks</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-emerald-900">
                    Created: <span className="font-semibold">{tasksBar.created}</span>
                  </span>
                  <span className="rounded-full border border-sky-200 bg-sky-50/70 px-2 py-1 text-sky-900">
                    Completed: <span className="font-semibold">{tasksBar.completed}</span>
                  </span>
                  <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">
                    Completion: <span className="font-semibold text-stone-900">{tasksBar.percent}%</span>
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-stone-500">This week</div>
            </div>

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-900">Mood trend</div>
                <div className="mt-2 inline-flex max-w-full overflow-x-auto rounded-full border border-black/10 bg-white/80 p-0.5 text-[11px]">
                  {[
                    { key: "7d", label: "7d" },
                    { key: "30d", label: "30d" },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setMoodRange(r.key)}
                      className={[
                        "rounded-full px-2.5 py-1 transition",
                        moodRange === r.key
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : "text-stone-600 hover:bg-stone-100",
                      ].join(" ")}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">
                    Logged: <span className="font-semibold text-stone-900">{moodStats.count}</span>
                  </span>
                  <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">
                    Avg: <span className="font-semibold text-stone-900">{moodStats.avg ?? "—"}</span>
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50/70 px-2 py-1 text-amber-900">
                    Missed: <span className="font-semibold">{missingMoodDays.length}</span>
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-stone-500">
                {moodRange === "7d" ? "Last 7 days" : "Last 30 days"}
              </div>
            </div>

            <div className="mt-3 h-44 sm:h-40 rounded-2xl border border-black/10 bg-white/60 p-2">
              {moodSeries.every((d) => d.mood == null) ? (
                <div className="h-full flex items-center justify-center text-sm text-stone-500">
                  No mood logs yet — add one in Reflections 🌿
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={moodSeriesForChart} margin={{ top: 14, right: 14, bottom: 6, left: 0 }}>
                    <defs>
                      {/* pastel gradient line */}
                      <linearGradient id="moodLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#BEE3F8" />
                        <stop offset="55%" stopColor="#C4B5FD" />
                        <stop offset="100%" stopColor="#FBCFE8" />
                      </linearGradient>

                      {/* pastel area gradient */}
                      <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0.62" />
                        <stop offset="45%" stopColor="#C4B5FD" stopOpacity="0.44" />
                        <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0.20" />
                      </linearGradient>
                    </defs>

                    {/* minimal horizontal grid like the reference */}
                    <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />

                    <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis domain={[0, 10]} hide />

                    <Tooltip content={<MoodTooltip />} cursor={{ stroke: "rgba(0,0,0,0.06)" }} />

                    {/* area */}
                    <Area
                      type="monotone"
                      dataKey="mood"
                      stroke="none"
                      fill="url(#moodFill)"
                      fillOpacity={1}
                      connectNulls={false}
                      baseValue={0}
                      isAnimationActive={true}
                    />

                    {/* missed-day markers (click to backfill) */}
                    <Line
                      type="linear"
                      dataKey="missingMarker"
                      stroke="none"
                      dot={<MissingMoodDot onPickDate={goToBackfill} />}
                      activeDot={false}
                      isAnimationActive={false}
                    />

                    {/* future-day markers */}
                    <Line
                      type="linear"
                      dataKey="futureMarker"
                      stroke="none"
                      dot={<FutureMoodDot />}
                      activeDot={false}
                      isAnimationActive={false}
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
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-2 text-[11px] text-stone-500">
              Trend window ends on <span className="font-medium text-stone-700">{moodTrendEndYMD}</span>{" "}
              ({week?.timeZone ?? "timezone unknown"}).
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-violet-300 bg-white" />
                Logged
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-stone-400 border-dashed bg-white" />
                Missed (past)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-slate-400/60 bg-slate-200/60" />
                Future ({futureMoodDays.length})
              </span>
            </div>

            {missingMoodDays.length > 0 ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="text-xs text-amber-900">
                  Missed mood check-ins. Tap a day to backfill:
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {missingMoodDays.map((d) => (
                    <button
                      key={d.ymd}
                      type="button"
                      onClick={() => goToBackfill(d.ymd)}
                      className="rounded-full border border-amber-300 bg-white/80 px-2.5 py-1 text-[11px] text-amber-900 hover:bg-white"
                    >
                      {d.day}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {moodStats.count < 3 ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                Sparse mood data in this range ({moodStats.count} logs). Treat trend readouts as directional only.
              </div>
            ) : null}

            <div className="mt-3 rounded-2xl bg-stone-50/70 p-3 text-sm text-stone-700">
              {moodStats.insight}
            </div>
          </div>

          {/* ✨ Weekly Insight (replaces Notifications) */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-stone-900">Weekly insight</div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">
                    Mood avg: <span className="font-semibold text-stone-900">{weeklyMoodStats.avg ?? "—"}</span>
                  </span>
                  <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">
                    Tasks: <span className="font-semibold text-stone-900">{tasksBar.percent}%</span>
                  </span>
                  <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">
                    Habit check-ins:{" "}
                    <span className="font-semibold text-stone-900">
                      {habitsPie.reduce((a, h) => a + Number(h.checkins || 0), 0)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-stone-500">This week ✨</div>
            </div>

            <div className="mt-3 rounded-2xl bg-stone-50/70 p-3 text-sm text-stone-700 leading-relaxed">
              {weeklyInsight}
            </div>

            <div className="mt-3 grid gap-2">
              <div className="rounded-2xl border border-black/5 bg-white/80 p-3 text-xs text-stone-700">
                <span className="font-medium text-stone-900">Mood × Tasks:</span> {moodTaskCorrelation}
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/80 p-3 text-xs text-stone-700">
                <span className="font-medium text-stone-900">Mood × Habits:</span> {moodHabitCorrelation}
              </div>
            </div>

            {weeklyMoodStats.count < 3 ? (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                Weekly insight is based on sparse mood logs ({weeklyMoodStats.count} this week), so interpretation is
                conservative.
              </div>
            ) : null}
          </div>
        </div>
      </Section>
    </div>
  );
}
