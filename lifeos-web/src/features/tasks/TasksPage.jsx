import { useEffect, useMemo, useState } from "react";
import Section from "../../shared/ui/Section";
import TaskComposer from "./components/TaskComposer";
import TaskList from "./components/TaskList";
import { listTodayTasks } from "./tasks.api";

function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

function ymdLocalToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);

  async function load() {
    const data = await listTodayTasks();
    setTasks(data ?? []);
  }

  useEffect(() => {
    (async () => {
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const taskStats = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const todayYMD = ymdLocalToday();
    const total = list.length;
    const done = list.filter((t) => t.status === "done").length;
    const todo = Math.max(0, total - done);
    const overdue = list.filter((t) => {
      if (t.status === "done") return false;
      const due = String(t?.due_date ?? "").slice(0, 10);
      return due && due < todayYMD;
    }).length;
    const completion = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, todo, overdue, completion };
  }, [tasks]);

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  return (
    <div className="space-y-8">
      <GlassPanel>
        <Section title="Tasks" subtitle="One clear next step is enough.">
          <div className="mb-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
              <div className="text-[11px] text-stone-500">Todo</div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{taskStats.todo}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-3 py-2">
              <div className="text-[11px] text-emerald-800">Done</div>
              <div className="mt-1 text-sm font-semibold text-emerald-900">{taskStats.done}</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 px-3 py-2">
              <div className="text-[11px] text-rose-800">Overdue</div>
              <div className="mt-1 text-sm font-semibold text-rose-900">{taskStats.overdue}</div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
              <div className="text-[11px] text-stone-500">Completion</div>
              <div className="mt-1 text-sm font-semibold text-stone-900">{taskStats.completion}%</div>
            </div>
          </div>

          <TaskComposer onCreated={load} />

          <div className="mt-3">
            {Array.isArray(tasks) && tasks.length > 0 ? (
              <TaskList tasks={tasks} onUpdated={load} />
            ) : (
              <div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
                Nothing here yet. Add one gentle task for today.
              </div>
            )}
          </div>
        </Section>
      </GlassPanel>
    </div>
  );
}
