import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Section from "../../shared/ui/Section";
import TaskComposer from "./components/TaskComposer";
import TaskList from "./components/TaskList";
import { listTasks, listTodayTasks } from "./tasks.api";
import { Icons } from "../../config/icons";

function GlassPanel({ children }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white/55 shadow-sm backdrop-blur-md">
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyTasksState() {
  return (
    <div className="rounded-2xl border border-black/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(245,247,240,0.9))] p-5">
      <div className="text-sm font-medium text-stone-900">A clear day starts small.</div>
      <p className="mt-1 text-sm text-stone-600">
        If your list is empty, that can be a gift. Add one task that would make today feel lighter or more complete.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-emerald-900">Start with one 10-minute task</span>
        <span className="rounded-full border border-sky-200 bg-sky-50/70 px-3 py-1 text-sky-900">Keep it specific</span>
        <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-stone-700">You can always add more later</span>
      </div>
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
  const [searchParams] = useSearchParams();
  const focusedTaskId = searchParams.get("item");
  const openReminder = searchParams.get("reminder") === "1";
  const tasksQuery = useQuery({
    queryKey: ["tasks", focusedTaskId ? "all" : "today"],
    queryFn: () => (focusedTaskId ? listTasks({ includeDone: true }) : listTodayTasks()),
  });
  const tasks = tasksQuery.data ?? [];
  const load = useCallback(() => tasksQuery.refetch(), [tasksQuery]);

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

  if (tasksQuery.isLoading) return <div className="text-stone-500">Loading gently...</div>;

  return (
    <div className="space-y-8">
      <GlassPanel>
        <Section title="Tasks" subtitle="One clear next step is enough." icon={Icons.tasks}>
          {focusedTaskId ? (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
              Focused from reminders. You’re seeing your full task list so the linked task is easy to find.
            </div>
          ) : null}

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
              <TaskList
                tasks={tasks}
                onUpdated={load}
                initialOpenId={focusedTaskId}
                highlightTaskId={focusedTaskId}
                autoOpenReminderForId={openReminder ? focusedTaskId : null}
              />
            ) : (
              <EmptyTasksState />
            )}
          </div>
        </Section>
      </GlassPanel>
    </div>
  );
}
