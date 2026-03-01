// lifeos-web/src/pages/LoginPage.jsx
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { endpoints } from "../shared/api/endpoints";
import { useAuth } from "../shared/auth/useAuth";
import bgTile from "../assets/bg-tile.jpg";

export default function LoginPage() {
  const { user, booting } = useAuth();
  const [busy, setBusy] = useState(false);

  // ✅ redirect AFTER render (avoid side effects during render)
  useEffect(() => {
    if (!booting && user) {
      window.location.replace("/");
    }
  }, [booting, user]);

  // While auth is booting, keep it calm
  const disabled = booting || busy;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${bgTile})`,
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
        backgroundPosition: "top left",
        backgroundAttachment: "fixed", // ✅ bg not scrollable
      }}
    >
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-emerald-50/80 via-rose-50/70 to-stone-50/80 backdrop-blur-[1px] p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]">
            <h1 className="text-2xl font-semibold text-stone-900">LifeOS</h1>

            <p className="mt-2 text-sm text-stone-600">
              A gentle productivity journal 🌸 habits, tasks, reflections, reminders.
            </p>

            <a
              href={endpoints.google}
              onClick={() => setBusy(true)}
              aria-disabled={disabled}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium shadow-sm transition-all duration-200 ${
                disabled
                  ? "opacity-60 pointer-events-none"
                  : "hover:bg-white/90 hover:-translate-y-[1px] hover:shadow-md"
              }`}
            >
              {booting
                ? "Checking session…"
                : busy
                ? "Signing in…"
                : "Continue with Google"}
            </a>

            <div className="mt-3 text-xs text-stone-500">
              Your timezone and gentle tone help personalize reminders.
            </div>

            {/* ✅ Privacy + Terms */}
            <div className="mt-4 text-[11px] text-center text-stone-500">
              By continuing, you agree to our{" "}
              <NavLink
                to="/terms"
                className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700"
              >
                Terms
              </NavLink>{" "}
              and{" "}
              <NavLink
                to="/privacy"
                className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700"
              >
                Privacy Policy
              </NavLink>
              .
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-stone-500">
            ✨ Calm. Simple. Consistent.
          </div>
        </div>
      </div>
    </div>
  );
}
