import { useEffect, useState } from "react";
import Section from "../../shared/ui/Section";
import TaskComposer from "./components/TaskComposer";
import TaskList from "./components/TaskList";
import { listTodayTasks } from "./tasks.api";

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
      <Section title="Tasks" subtitle="One clear next step is enough.">
        <TaskComposer onCreated={load} />
        <div className="mt-3">
          <TaskList tasks={tasks} onUpdated={load} />
        </div>
      </Section>
    </div>
  );
}