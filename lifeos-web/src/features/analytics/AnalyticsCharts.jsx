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
      <div className="font-medium text-stone-900">{label}</div>
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

function MoodDot({ cx, cy, payload, stroke }) {
  if (!payload || payload.mood == null) return null;
  return <circle cx={cx} cy={cy} r={4.5} fill="#fff" stroke={stroke || "rgba(0,0,0,0.25)"} strokeWidth={2} />;
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
    <g onClick={() => onPickDate?.(payload.ymd)} style={{ cursor: "pointer" }} aria-label={`Backfill mood for ${payload.day}`}>
      <circle cx={cx} cy={cy} r={5} fill="#fff" stroke="rgba(120,120,120,0.45)" strokeWidth={1.5} strokeDasharray="3 2" />
      <line x1={cx - 2.2} y1={cy} x2={cx + 2.2} y2={cy} stroke="rgba(120,120,120,0.45)" strokeWidth={1.2} />
      <line x1={cx} y1={cy - 2.2} x2={cx} y2={cy + 2.2} stroke="rgba(120,120,120,0.45)" strokeWidth={1.2} />
    </g>
  );
}

function FutureMoodDot({ cx, cy, payload }) {
  if (!payload || !payload.isFuture) return null;
  return <circle cx={cx} cy={cy} r={4.2} fill="rgba(148,163,184,0.14)" stroke="rgba(100,116,139,0.35)" strokeWidth={1.3} />;
}

export default function AnalyticsCharts(props) {
  const {
    habitsPie,
    tasksBar,
    data,
    pulse,
    moodRange,
    setMoodRange,
    moodStats,
    missingMoodDays,
    futureMoodDays,
    moodSeries,
    moodSeriesForChart,
    goToBackfill,
    moodTrendEndYMD,
    week,
    weeklyMoodStats,
    weeklyInsight,
    weeklyHighlights,
    moodTaskCorrelation,
    moodHabitCorrelation,
  } = props;

  return (
    <>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-stone-900">Habits</div>
            <div className="text-xs text-stone-500">Share of check-ins</div>
          </div>

          {habitsPie.length === 0 ? (
            <div className="mt-3 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">No habit check-ins tracked this week yet.</div>
          ) : (
            <div className="mt-3 grid items-center gap-4 sm:grid-cols-2">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={habitsPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive label={false}>
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
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-3 w-3 rounded-full border border-white/60" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <div className="truncate text-sm text-stone-800">{h.name}</div>
                    </div>
                    <div className="text-xs text-stone-500">{h.checkins}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-900">Tasks</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-1 text-emerald-900">Created: <span className="font-semibold">{tasksBar.created}</span></span>
                <span className="rounded-full border border-sky-200 bg-sky-50/70 px-2 py-1 text-sky-900">Completed: <span className="font-semibold">{tasksBar.completed}</span></span>
                <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">Completion: <span className="font-semibold text-stone-900">{tasksBar.percent}%</span></span>
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
              <div className="mt-1 text-lg font-semibold text-rose-900">{Number(data?.tasks?.overdueEndOfWeek ?? 0)}</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-stone-600">
              <span>Completion rate</span>
              <span className={`inline-flex items-center gap-1 font-medium text-stone-700 transition ${pulse ? "scale-[1.06]" : "scale-100"}`}>
                {tasksBar.percent}% {pulse ? <span className="text-[11px]">✨</span> : null}
              </span>
            </div>

            <div className="mt-2 h-3 overflow-hidden rounded-full border border-black/5 bg-stone-100">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${pulse ? "brightness-[1.03]" : ""}`}
                style={{ width: `${tasksBar.percent}%`, background: "linear-gradient(90deg, #DFF5E6, #D9F0FF, #EFE4FF, #FFE0EB)" }}
              />
            </div>

            <div className="mt-2 text-xs text-stone-500">
              {tasksBar.created > 0 ? `${tasksBar.completed} of ${tasksBar.created} finished` : "No tasks created this week yet."}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-900">Mood trend</div>
              <div className="mt-2 inline-flex max-w-full overflow-x-auto rounded-full border border-black/10 bg-white/80 p-0.5 text-[11px]">
                {[{ key: "7d", label: "7d" }, { key: "30d", label: "30d" }].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setMoodRange(r.key)}
                    className={["rounded-full px-2.5 py-1 transition", moodRange === r.key ? "border border-emerald-200 bg-emerald-50 text-emerald-900" : "text-stone-600 hover:bg-stone-100"].join(" ")}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">Logged: <span className="font-semibold text-stone-900">{moodStats.count}</span></span>
                <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">Avg: <span className="font-semibold text-stone-900">{moodStats.avg ?? "—"}</span></span>
                <span className="rounded-full border border-amber-200 bg-amber-50/70 px-2 py-1 text-amber-900">Missed: <span className="font-semibold">{missingMoodDays.length}</span></span>
              </div>
            </div>
            <div className="text-[11px] text-stone-500">{moodRange === "7d" ? "Last 7 days" : "Last 30 days"}</div>
          </div>

          <div className="mt-3 h-44 rounded-2xl border border-black/10 bg-white/60 p-2 sm:h-40">
            {moodSeries.every((d) => d.mood == null) ? (
              <div className="flex h-full items-center justify-center text-sm text-stone-500">No mood logs yet — add one in Reflections 🌿</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={moodSeriesForChart} margin={{ top: 14, right: 14, bottom: 6, left: 0 }}>
                  <defs>
                    <linearGradient id="moodLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#BEE3F8" />
                      <stop offset="55%" stopColor="#C4B5FD" />
                      <stop offset="100%" stopColor="#FBCFE8" />
                    </linearGradient>
                    <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#BFDBFE" stopOpacity="0.62" />
                      <stop offset="45%" stopColor="#C4B5FD" stopOpacity="0.44" />
                      <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0.20" />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis domain={[0, 10]} hide />
                  <Tooltip content={<MoodTooltip />} cursor={{ stroke: "rgba(0,0,0,0.06)" }} />
                  <Area type="monotone" dataKey="mood" stroke="none" fill="url(#moodFill)" fillOpacity={1} connectNulls={false} baseValue={0} isAnimationActive />
                  <Line type="linear" dataKey="missingMarker" stroke="none" dot={<MissingMoodDot onPickDate={goToBackfill} />} activeDot={false} isAnimationActive={false} />
                  <Line type="linear" dataKey="futureMarker" stroke="none" dot={<FutureMoodDot />} activeDot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="mood" connectNulls={false} stroke="url(#moodLine)" strokeWidth={3} dot={<MoodDot />} activeDot={<MoodActiveDot />} isAnimationActive />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 text-[11px] text-stone-500">
            Trend window ends on <span className="font-medium text-stone-700">{moodTrendEndYMD}</span> ({week?.timeZone ?? "timezone unknown"}).
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-violet-300 bg-white" />Logged</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-stone-400 border-dashed bg-white" />Missed (past)</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-400/60 bg-slate-200/60" />Future ({futureMoodDays.length})</span>
          </div>

          {missingMoodDays.length > 0 ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              <div className="text-xs text-amber-900">Missed mood check-ins. Tap a day to backfill:</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingMoodDays.map((d) => (
                  <button key={d.ymd} type="button" onClick={() => goToBackfill(d.ymd)} className="rounded-full border border-amber-300 bg-white/80 px-2.5 py-1 text-[11px] text-amber-900 hover:bg-white">
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

          <div className="mt-3 rounded-2xl bg-stone-50/70 p-3 text-sm text-stone-700">{moodStats.insight}</div>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white/70 p-4 transition hover:-translate-y-[1px] hover:shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-stone-900">Weekly insight</div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">Mood avg: <span className="font-semibold text-stone-900">{weeklyMoodStats.avg ?? "—"}</span></span>
                <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">Tasks: <span className="font-semibold text-stone-900">{tasksBar.percent}%</span></span>
                <span className="rounded-full border border-black/5 bg-white/80 px-2 py-1 text-stone-700">Habit check-ins: <span className="font-semibold text-stone-900">{habitsPie.reduce((a, h) => a + Number(h.checkins || 0), 0)}</span></span>
              </div>
            </div>
            <div className="text-[11px] text-stone-500">This week ✨</div>
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm font-medium text-emerald-950">
            {weeklyHighlights?.headline}
          </div>

          <div className="mt-3 rounded-2xl bg-stone-50/70 p-3 text-sm leading-relaxed text-stone-700">{weeklyInsight}</div>

          <div className="mt-3 grid gap-2">
            <div className="rounded-2xl border border-black/5 bg-white/80 p-3">
              <div className="text-[11px] uppercase tracking-wide text-stone-500">What Helped</div>
              <div className="mt-1 text-sm text-stone-800">{weeklyHighlights?.strengths?.[0]}</div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/80 p-3">
              <div className="text-[11px] uppercase tracking-wide text-stone-500">Watch Gently</div>
              <div className="mt-1 text-sm text-stone-800">{weeklyHighlights?.watchouts?.[0]}</div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
              <div className="text-[11px] uppercase tracking-wide text-sky-700">Try Next Week</div>
              <div className="mt-1 text-sm text-sky-950">{weeklyHighlights?.nextStep}</div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-black/5 bg-white/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wide text-stone-500">Gentle Plan</div>
              <span className="rounded-full border border-black/10 bg-stone-50 px-2 py-1 text-[10px] text-stone-600">
                Read confidence: {weeklyHighlights?.confidence ?? "early"}
              </span>
            </div>
            <div className="mt-2 space-y-2 text-sm text-stone-800">
              <div><span className="font-medium text-stone-900">Focus:</span> {weeklyHighlights?.focus}</div>
              <div><span className="font-medium text-stone-900">Protect:</span> {weeklyHighlights?.protect}</div>
              <div><span className="font-medium text-stone-900">Keep:</span> {weeklyHighlights?.keep}</div>
            </div>
          </div>

          {weeklyMoodStats.count < 3 ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              Weekly insight is based on sparse mood logs ({weeklyMoodStats.count} this week), so interpretation is conservative.
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
