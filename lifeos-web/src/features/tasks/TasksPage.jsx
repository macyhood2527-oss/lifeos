import { useEffect, useState } from "react";
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

  if (loading) return <div className="text-stone-500">Loading gently...</div>;

  return (
    <div className="space-y-8">
      <GlassPanel>
        <Section title="Tasks" subtitle="One clear next step is enough.">
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
