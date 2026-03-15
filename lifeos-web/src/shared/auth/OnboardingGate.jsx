import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Loader from "../ui/loader";
import { useAuth } from "./useAuth";
import { listTasks } from "../../features/tasks/tasks.api";
import { listHabits } from "../../features/habits/habits.api";
import { isOnboardingComplete, markOnboardingComplete } from "../../features/onboarding/onboarding.state";

export default function OnboardingGate({ children }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      if (!user?.id) {
        if (alive) {
          setComplete(true);
          setReady(true);
        }
        return;
      }

      if (isOnboardingComplete(user.id)) {
        if (alive) {
          setComplete(true);
          setReady(true);
        }
        return;
      }

      try {
        const [tasks, habits] = await Promise.all([
          listTasks({ includeDone: true }),
          listHabits({ includeInactive: true }),
        ]);

        const hasStarted =
          (Array.isArray(tasks) && tasks.length > 0) ||
          (Array.isArray(habits) && habits.length > 0);

        if (hasStarted) {
          markOnboardingComplete(user.id);
        }

        if (alive) {
          setComplete(hasStarted);
          setReady(true);
        }
      } catch {
        if (alive) {
          setComplete(true);
          setReady(true);
        }
      }
    }

    check();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  if (!ready) return <Loader label="Preparing your space…" />;
  if (!complete) return <Navigate to="/welcome" replace />;
  return children;
}
