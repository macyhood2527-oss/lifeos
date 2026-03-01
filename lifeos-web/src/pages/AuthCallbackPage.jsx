// lifeos-web/src/pages/AuthCallbackPage.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/AuthProvider";
import bgTile from "../assets/bg-tile.jpg";

export default function AuthCallbackPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
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
    refresh().finally(() => nav("/", { replace: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50/70 text-emerald-900">
                🌷
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-900">
                  Logging you in…
                </div>
                <div className="mt-0.5 text-xs text-stone-600">
                  Setting up your calm space. One moment.
                </div>
              </div>
            </div>

            {/* soft loading bar */}
            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-black/5">
              <div className="h-full w-1/2 rounded-full bg-emerald-200/80 animate-pulse" />
            </div>

            <div className="mt-4 text-[11px] text-stone-500">
              If this takes too long, go back and try again.
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
