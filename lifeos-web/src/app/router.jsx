import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import RequireAuth from "../shared/auth/RequireAuth";
import OnboardingGate from "../shared/auth/OnboardingGate";
import Loader from "../shared/ui/loader";

const AuthCallbackPage = lazy(() => import("../pages/AuthCallbackPage"));
const PrivacyPage = lazy(() => import("../pages/PrivacyPage"));
const TermsPage = lazy(() => import("../pages/TermsPage"));
const FaqsPage = lazy(() => import("../pages/FaqsPage"));
const AboutPage = lazy(() => import("../pages/AboutPage"));
const AppShell = lazy(() => import("../features/layout/AppShell"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const TodayPage = lazy(() => import("../features/today/TodayPage"));
const HabitsPage = lazy(() => import("../features/habits/HabitsPage"));
const TasksPage = lazy(() => import("../features/tasks/TasksPage"));
const ReflectionsPage = lazy(() => import("../features/reflections/ReflectionsPage"));
const AnalyticsPage = lazy(() => import("../features/analytics/AnalyticsPage"));
const SettingsPage = lazy(() => import("../features/settings/SettingsPage"));
const RemindersPage = lazy(() => import("../features/reminders/RemindersPage"));
const WelcomePage = lazy(() => import("../features/onboarding/WelcomePage"));

function withSuspense(element, { small = false } = {}) {
  return (
    <Suspense fallback={<Loader small={small} />}>
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // PUBLIC ROUTES
  { path: "/login", element: withSuspense(<LoginPage />) },
  { path: "/auth/callback", element: withSuspense(<AuthCallbackPage />) },
  { path: "/privacy", element: withSuspense(<PrivacyPage />) },
  { path: "/terms", element: withSuspense(<TermsPage />) },
  { path: "/faqs", element: withSuspense(<FaqsPage />) },
  { path: "/about-me", element: withSuspense(<AboutPage />) },
  {
    path: "/welcome",
    element: (
      <RequireAuth>
        {withSuspense(<WelcomePage />)}
      </RequireAuth>
    ),
  },

  // PROTECTED APP
  {
    path: "/",
    element: (
      <RequireAuth>
        <OnboardingGate>{withSuspense(<AppShell />)}</OnboardingGate>
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(<TodayPage />, { small: true }) },
      { path: "today", element: withSuspense(<TodayPage />, { small: true }) },
      { path: "habits", element: withSuspense(<HabitsPage />, { small: true }) },
      { path: "tasks", element: withSuspense(<TasksPage />, { small: true }) },
      { path: "reminders", element: withSuspense(<RemindersPage />, { small: true }) },
      { path: "reflections", element: withSuspense(<ReflectionsPage />, { small: true }) },
      { path: "analytics", element: withSuspense(<AnalyticsPage />, { small: true }) },
      { path: "settings", element: withSuspense(<SettingsPage />, { small: true }) },
    ],
  },
]);
