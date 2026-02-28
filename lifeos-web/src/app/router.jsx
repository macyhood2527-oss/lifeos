import { createBrowserRouter } from "react-router-dom";

import RequireAuth from "../shared/auth/RequireAuth";
import AuthCallbackPage from "../pages/AuthCallbackPage";
import AppShell from "../features/layout/AppShell";

import LoginPage from "../pages/LoginPage";
import TodayPage from "../features/today/TodayPage";
import HabitsPage from "../features/habits/HabitsPage";
import TasksPage from "../features/tasks/TasksPage";
import ReflectionsPage from "../features/reflections/ReflectionsPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TodayPage /> },
      { path: "today", element: <TodayPage /> }, // ✅ ADD THIS
      { path: "habits", element: <HabitsPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "reflections", element: <ReflectionsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
    ],
  },
]);
