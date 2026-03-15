import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Section from "../../shared/ui/Section";
import { getWeeklyAnalytics } from "./analytics.api";
import { Icons } from "../../config/icons";

// ✅ adjust path if yours differs
import { listReflections } from "../reflections/reflections.api";

const AnalyticsCharts = lazy(() => import("./AnalyticsCharts"));

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
  if (vals.length === 0) return "No mood logs yet. Add one in Reflections whenever you feel ready.";
  if (vals.length === 1) return "You logged your mood once this week. That small start still counts.";

  const withMood = series.filter((p) => Number.isFinite(p.mood));
  if (withMood.length < 2) return "There is not enough mood data yet to spot a clear pattern.";

  const mids = Math.floor(withMood.length / 2);
  const early = withMood.slice(0, mids).map((p) => p.mood);
  const late = withMood.slice(mids).map((p) => p.mood);

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
  const a1 = avg(early);
  const a2 = avg(late);
  const diff = a2 - a1;

  if (Math.abs(diff) < 0.35) return "Your mood stayed fairly steady this week.";
  if (diff >= 0.35 && diff < 1.25) return "Your mood lifted a little as the week went on.";
  if (diff >= 1.25) return "Your mood improved quite a bit through the week.";
  if (diff <= -0.35 && diff > -1.25) return "Your mood dipped a little, so a softer pace may help.";
  return "Your mood dropped quite a bit this week, so extra kindness would help.";
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

function getLowestDay(moodSeries) {
  let lowest = null;
  for (const p of moodSeries) {
    if (!Number.isFinite(p.mood)) continue;
    if (!lowest || p.mood < lowest.mood) lowest = p;
  }
  return lowest;
}

function getTopHabit(habitsPie) {
  const list = Array.isArray(habitsPie) ? habitsPie : [];
  if (!list.length) return null;
  return [...list].sort((a, b) => Number(b.checkins || 0) - Number(a.checkins || 0))[0] ?? null;
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
        "There was not much mood data this week, and that is okay.",
        "This week was quiet on mood logs. No pressure.",
        "You did not leave much mood data this week, but we can still reflect gently.",
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
        `Your average mood was about ${moodAvg}/10.`,
        `Your mood average came out to around ${moodAvg}/10.`,
        `Across your check-ins, your mood averaged ${moodAvg}/10.`,
      ])
    );

    if (trend === "up") {
      s.push(
        pick([
          "Your mood improved as the week went on.",
          "Your mood gently lifted toward the end of the week.",
          "There was a small upward shift in your mood.",
        ])
      );
    } else if (trend === "down") {
      s.push(
        pick([
          "Your mood got a little heavier as the days went on.",
          "Your mood dropped later in the week, so you may need more recovery time.",
          "The second half of the week looked a bit heavier than the first.",
        ])
      );
    } else if (trend === "steady") {
      s.push(
        pick([
          "Your mood stayed fairly consistent.",
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
        "If you log your mood once or twice next week, clearer patterns will start to show.",
        "A couple of mood check-ins next week will make this feel more personal.",
        "Even one small mood check-in next week will make this more useful.",
      ])
    );
  }

  // 3) tasks follow-through
  if (completion >= 80) {
    s.push(
      pick([
        `You followed through on most of your tasks at ${completion}%.`,
        `Your task completion was strong at ${completion}%.`,
        `You stayed consistent with your tasks and finished ${completion}%.`,
      ])
    );
  } else if (completion >= 55) {
    s.push(
      pick([
        `You made steady progress on tasks with ${completion}% completed.`,
        `Your tasks moved forward at a steady pace this week.`,
        `You kept things moving and completed ${completion}% of your tasks.`,
      ])
    );
  } else if (completion > 0) {
    s.push(
      pick([
        `Tasks felt slower this week, with ${completion}% completed.`,
        `You did what you could, and task completion landed at ${completion}%.`,
        `Progress was lighter this week, and that is okay.`,
      ])
    );
  } else {
    s.push(
      pick([
        "Tasks were quiet this week. Not every week has to be about output.",
        "No task completion showed up this week. This may have been a reset week.",
        "No tasks were finished this week, so your energy may have been needed elsewhere.",
      ])
    );
  }

  // 4) habits consistency
  if (habitTotal >= 7) {
    s.push(
      pick([
        "Your habits were very consistent this week.",
        "Your habit check-ins stayed strong, and that is quiet momentum.",
        "You showed up for your habits a lot this week.",
      ])
    );
  } else if (habitTotal >= 3) {
    s.push(
      pick([
        "You kept a few habits going, and that still counts.",
        "Your habits showed up a handful of times, which is a good sign.",
        "There is a small thread of consistency in your habits.",
      ])
    );
  } else if (habitTotal > 0) {
    s.push(
      pick([
        "Your habits were light, but you still showed up at least once.",
        "Even one habit check-in shows that you did not give up.",
        "A small habit check-in is still a win.",
      ])
    );
  } else {
    s.push(
      pick([
        "Your habits were quiet this week, so one easy anchor habit may help next week.",
        "No habit check-ins showed up, so it may help to make next week gentler.",
        "No habits were logged this week. One tiny habit next week could change the feel.",
      ])
    );
  }

  // 5) gentle close
  s.push(
    pick([
      "Next week, keep it simple. One small habit and one meaningful task is enough.",
      "If this week felt messy, you do not need to fix everything. Just choose one gentle priority.",
      "You are building awareness, not perfection. That matters.",
      "Try starting next week more softly, then build up if your energy returns.",
      "If you want a simple reset, choose one small anchor habit that feels easy to keep.",
    ])
  );

  // 4–6 sentences (cap so it doesn’t feel too long)
  return s.filter(Boolean).slice(0, 6).join(" ");
}

function buildWeeklyHighlights({ moodStats, moodSeries, tasksBar, habitsPie }) {
  const trend = getTrendLabel(moodSeries);
  const peak = getPeakDay(moodSeries);
  const low = getLowestDay(moodSeries);
  const topHabit = getTopHabit(habitsPie);
  const habitTotal = (habitsPie || []).reduce((a, h) => a + Number(h.checkins || 0), 0);

  let headline = "A quieter week still teaches you something useful.";
  if (tasksBar.percent >= 75 && Number.isFinite(moodStats.avg) && moodStats.avg >= 7) {
    headline = "This week looked steady, capable, and emotionally lighter.";
  } else if (tasksBar.percent >= 60 || habitTotal >= 5) {
    headline = "There was meaningful momentum here, even if the week felt mixed.";
  } else if (Number.isFinite(moodStats.avg) && moodStats.avg <= 5) {
    headline = "This week looked heavier, so gentleness matters more than pressure.";
  }

  const strengths = [];
  if (tasksBar.percent >= 60) strengths.push(`You completed ${tasksBar.percent}% of your tasks, which suggests decent follow-through.`);
  if (topHabit && Number(topHabit.checkins || 0) > 0) strengths.push(`${topHabit.name} was your strongest habit anchor with ${topHabit.checkins} check-in${Number(topHabit.checkins) === 1 ? "" : "s"}.`);
  if (peak) strengths.push(`${peak.day} looked like your brightest day emotionally.`);
  if (!strengths.length) strengths.push("You still showed up enough to leave useful signals for next week.");

  const watchouts = [];
  if (trend === "down") watchouts.push("Your mood trended downward across the week, so the back half may have been heavier than the start.");
  if (tasksBar.created > 0 && tasksBar.percent < 45) watchouts.push("A lot of tasks stayed open, which may be a sign that your weekly load is still a bit high.");
  if (habitTotal === 0) watchouts.push("No habits were checked in, so your routine anchors may be too hard to reach right now.");
  if (low) watchouts.push(`${low.day} may have been a lower-energy day worth remembering when you plan next week.`);
  if (!watchouts.length) watchouts.push("Nothing looks especially alarming here. The main opportunity is consistency, not correction.");

  let nextStep = "Next week, keep one small task and one easy habit visible so momentum starts earlier.";
  if (trend === "down") nextStep = "Next week, front-load easier wins early and protect your energy later in the week.";
  else if (tasksBar.percent < 45) nextStep = "Try trimming your weekly task load a little and define one clearer priority each day.";
  else if (habitTotal === 0) nextStep = "Pick one very easy anchor habit for next week, something you can do even on low-energy days.";
  else if (topHabit) nextStep = `Build around ${topHabit.name} again next week, since it already looks like a habit your rhythm supports.`;

  const focus = tasksBar.percent >= 60
    ? "Keep your task list clear and limited so follow-through stays sustainable."
    : "Reduce weekly load and make your next important task easier to start.";
  const protect = trend === "down"
    ? "Protect the second half of your week a little more, since your energy seemed to dip there."
    : "Protect the rhythm that already worked instead of changing too much at once.";
  const keep = topHabit
    ? `Keep ${topHabit.name} visible, because it already looks like a habit your week can support.`
    : "Keep one tiny anchor habit visible so the week has somewhere gentle to restart.";
  const confidence = moodStats.count >= 4 ? "solid" : moodStats.count >= 2 ? "light" : "early";

  return {
    headline,
    strengths,
    watchouts,
    nextStep,
    focus,
    protect,
    keep,
    confidence,
  };
}

function EmptyInsightsState() {
  return (
    <div className="rounded-2xl border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(240,247,242,0.9))] p-5">
      <div className="text-sm font-medium text-stone-900">Insights get warmer and smarter once you leave a few signals.</div>
      <p className="mt-1 text-sm text-stone-600">
        Try logging one reflection, checking in one habit, or finishing one task this week. Even a small amount of data is enough to start spotting a pattern.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-emerald-900">1 reflection</span>
        <span className="rounded-full border border-sky-200 bg-sky-50/70 px-3 py-1 text-sky-900">1 completed task</span>
        <span className="rounded-full border border-violet-200 bg-violet-50/70 px-3 py-1 text-violet-900">1 habit check-in</span>
      </div>
    </div>
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

  const weeklyHighlights = useMemo(
    () =>
      buildWeeklyHighlights({
        moodStats: weeklyMoodStats,
        moodSeries: weeklyMoodSeries,
        tasksBar,
        habitsPie,
      }),
    [habitsPie, tasksBar, weeklyMoodSeries, weeklyMoodStats]
  );

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

  const hasWeeklySignals =
    weeklyMoodStats.count > 0 ||
    tasksBar.created > 0 ||
    tasksBar.completed > 0 ||
    habitsPie.some((h) => Number(h.checkins || 0) > 0);

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  const week = data?.week;
  const title = week ? `${week.start} → ${week.end}` : "This week";

  return (
    <div className="space-y-8">
      <Section title="Analytics" subtitle="A soft recap of your week." icon={Icons.analytics}>
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

        {!hasWeeklySignals ? <div className="mt-4"><EmptyInsightsState /></div> : null}

        <Suspense
          fallback={
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="h-72 rounded-2xl border border-black/5 bg-white/70 p-4 animate-pulse" />
              <div className="h-72 rounded-2xl border border-black/5 bg-white/70 p-4 animate-pulse" />
              <div className="h-80 rounded-2xl border border-black/5 bg-white/70 p-4 animate-pulse lg:col-span-2" />
            </div>
          }
        >
          <AnalyticsCharts
            habitsPie={habitsPie}
            tasksBar={tasksBar}
            data={data}
            pulse={pulse}
            moodRange={moodRange}
            setMoodRange={setMoodRange}
            moodStats={moodStats}
            missingMoodDays={missingMoodDays}
            futureMoodDays={futureMoodDays}
            moodSeries={moodSeries}
            moodSeriesForChart={moodSeriesForChart}
            goToBackfill={goToBackfill}
            moodTrendEndYMD={moodTrendEndYMD}
            week={week}
            weeklyMoodStats={weeklyMoodStats}
            weeklyInsight={weeklyInsight}
            weeklyHighlights={weeklyHighlights}
            moodTaskCorrelation={moodTaskCorrelation}
            moodHabitCorrelation={moodHabitCorrelation}
          />
        </Suspense>
      </Section>
    </div>
  );
}
