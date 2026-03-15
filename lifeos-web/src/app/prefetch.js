import { queryClient } from "../shared/query/queryClient";
import { listTodayTasks, listTasks } from "../features/tasks/tasks.api";
import { listHabits } from "../features/habits/habits.api";
import { getTodayReflection, listReflections } from "../features/reflections/reflections.api";
import { getWeeklyAnalytics } from "../features/analytics/analytics.api";
import { listReminders } from "../features/reminders/reminders.api";

const routeModules = {
  today: () => import("../features/today/TodayPage"),
  tasks: () => import("../features/tasks/TasksPage"),
  habits: () => import("../features/habits/HabitsPage"),
  reflections: () => import("../features/reflections/ReflectionsPage"),
  analytics: () => import("../features/analytics/AnalyticsPage"),
  reminders: () => import("../features/reminders/RemindersPage"),
  settings: () => import("../features/settings/SettingsPage"),
};

function prefetchRouteQuery(key, queryFn, staleTime) {
  return queryClient.prefetchQuery({
    queryKey: key,
    queryFn,
    ...(staleTime != null ? { staleTime } : {}),
  }).catch(() => undefined);
}

export function prefetchRouteResources(routeKey) {
  routeModules[routeKey]?.();

  switch (routeKey) {
    case "today":
      prefetchRouteQuery(["tasks", "today"], () => listTodayTasks());
      prefetchRouteQuery(["habits", "active"], () => listHabits({ includeInactive: false }));
      prefetchRouteQuery(["reflection", "today"], () => getTodayReflection());
      prefetchRouteQuery(["analytics", "weekly"], () => getWeeklyAnalytics());
      break;
    case "tasks":
      prefetchRouteQuery(["tasks", "today"], () => listTodayTasks());
      break;
    case "habits":
      prefetchRouteQuery(["habits", "active"], () => listHabits({ includeInactive: false }));
      break;
    case "reflections":
      prefetchRouteQuery(["reflection", "today"], () => getTodayReflection());
      prefetchRouteQuery(["reflections", "list"], () => listReflections({ limit: 120, offset: 0 }));
      break;
    case "analytics":
      prefetchRouteQuery(["analytics", "weekly"], () => getWeeklyAnalytics());
      prefetchRouteQuery(["reflections", "list"], () => listReflections({ limit: 120, offset: 0 }));
      break;
    case "reminders":
      prefetchRouteQuery(["reminders", "list"], () => listReminders(), 2 * 60_000);
      prefetchRouteQuery(["tasks", "all"], () => listTasks({ includeDone: true }));
      prefetchRouteQuery(["habits", "all"], () => listHabits({ includeInactive: true }));
      break;
    case "settings":
    default:
      break;
  }
}
