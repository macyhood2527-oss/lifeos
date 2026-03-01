// lifeos-web/src/pages/AuthCallbackPage.jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthProvider"; // use the same hook you use elsewhere
import bgTile from "../assets/bg-tile.jpg";

export default function AuthCallbackPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // URL like: /auth/callback#token=xxxx
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const token = params.get("token");

    if (token) {
      localStorage.setItem("lifeos_token", token);
    }

    // Clean hash (optional)
    window.history.replaceState({}, document.title, "/auth/callback");

    // refresh user then go home
    Promise.resolve(refresh?.())
      .catch(() => {
        // if refresh fails, send back to login
        nav("/login?error=auth_failed", { replace: true });
      })
      .finally(() => {
        nav("/", { replace: true });
      });
  }, [nav, refresh]);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${bgTile})`,
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
        backgroundPosition: "top left",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen grid place-items-center bg-gradient-to-b from-emerald-50/80 via-rose-50/70 to-stone-50/80 backdrop-blur-[1px] p-6">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border border-black/5 bg-white/70 p-6 shadow-sm backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-900">
              🌷 Signing you in
            </div>

            <h1 className="mt-3 text-xl font-semibold text-stone-900">
              Welcome back
            </h1>

            <p className="mt-2 text-sm text-stone-600">
              One gentle moment—setting up your space…
            </p>

            {/* soft loader */}
            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full border border-black/10 bg-white/70">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-200/80" />
              </div>
              <div className="mt-2 text-xs text-stone-500">
                Syncing your session ✨
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-stone-500">
            Calm progress over pressure.
          </div>
        </div>
      </div>
    </div>
  );
}
