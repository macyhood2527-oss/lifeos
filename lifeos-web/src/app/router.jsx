import { createBrowserRouter } from "react-router-dom";

import RequireAuth from "../shared/auth/RequireAuth";
import AuthCallbackPage from "../pages/AuthCallbackPage";
import PrivacyPage from "../pages/PrivacyPage";
import TermsPage from "../pages/TermsPage";
import FaqsPage from "../pages/FaqsPage";
import AboutPage from "../pages/AboutPage";
import AppShell from "../features/layout/AppShell";

import LoginPage from "../pages/LoginPage";
import TodayPage from "../features/today/TodayPage";
import HabitsPage from "../features/habits/HabitsPage";
import TasksPage from "../features/tasks/TasksPage";
import ReflectionsPage from "../features/reflections/ReflectionsPage";
import AnalyticsPage from "../features/analytics/AnalyticsPage";
import SettingsPage from "../features/settings/SettingsPage";

export const router = createBrowserRouter([
  // PUBLIC ROUTES
  { path: "/login", element: <LoginPage /> },
  { path: "/auth/callback", element: <AuthCallbackPage /> },
  { path: "/privacy", element: <PrivacyPage /> },   // ✅ add this
  { path: "/terms", element: <TermsPage /> },       // ✅ add this
  { path: "/faqs", element: <FaqsPage /> },
  { path: "/about-me", element: <AboutPage /> },

  // PROTECTED APP
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <TodayPage /> },
      { path: "today", element: <TodayPage /> },
      { path: "habits", element: <HabitsPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "reflections", element: <ReflectionsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);
