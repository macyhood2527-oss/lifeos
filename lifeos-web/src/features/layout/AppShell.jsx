import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import bgTile from "../../assets/bg-tile.jpg";
import lifeosBanner from "../../assets/lifeos-banner.png";

const linkBase =
  "relative shrink-0 rounded-2xl px-3 py-2 text-sm whitespace-nowrap " +
  "transition-all duration-200 ease-out " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 " +
  "active:scale-[0.98]";

function linkClass({ isActive }) {
  return `${linkBase} ${
    isActive
      ? "text-stone-900 font-medium"
      : "text-stone-700 hover:text-stone-900"
  }`;
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const greeting = user?.name
    ? `Hi, ${user.name} 🌷 small wins, gently.`
    : "Hi 🌷 small wins, gently.";

  // --- animated indicator state for tabs ---
  const navRef = useRef(null);
  const itemRefs = useRef(new Map()); // key -> element
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const tabs = [
    { key: "today", label: "Today", to: "/", end: true },
    { key: "habits", label: "Habits", to: "/habits" },
    { key: "tasks", label: "Tasks", to: "/tasks" },
    { key: "reflections", label: "Reflections", to: "/reflections" },
    { key: "analytics", label: "Analytics", to: "/analytics" },
  ];

  function activeKeyFromPath(pathname) {
    if (pathname === "/") return "today";
    if (pathname.startsWith("/habits")) return "habits";
    if (pathname.startsWith("/tasks")) return "tasks";
    if (pathname.startsWith("/reflections")) return "reflections";
    if (pathname.startsWith("/analytics")) return "analytics";
    return "today";
  }

  function measureIndicator() {
    const nav = navRef.current;
    if (!nav) return;

    const activeKey = activeKeyFromPath(location.pathname);
    const el = itemRefs.current.get(activeKey);
    if (!el) return;

    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    setIndicator({
      left: elRect.left - navRect.left,
      width: elRect.width,
      ready: true,
    });
  }

  useLayoutEffect(() => {
    measureIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => measureIndicator();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: `url(${bgTile})`,
        backgroundRepeat: "repeat",
        backgroundSize: "120px",
        backgroundPosition: "top left",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Local animations (fade + float) */}
      <style>{`
        @keyframes lifeosFadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lifeosFloat {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }
        .lifeos-fade {
          animation: lifeosFadeUp 520ms ease-out both;
        }
        .lifeos-float {
          animation: lifeosFloat 4.2s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-rose-50/70 to-stone-50/80 backdrop-blur-[1px]">
        <div className="mx-auto max-w-5xl p-4 md:p-6">
          {/* Header panel */}
          <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur shadow-sm overflow-hidden lifeos-fade">
            <header className="relative px-4 pt-4 pb-3">
              {/* Logout top-right */}
              <div className="flex items-start justify-end">
                <button
                  onClick={logout}
                  className="shrink-0 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm transition hover:bg-white active:scale-[0.98]"
                >
                  Logout
                </button>
              </div>

              {/* Banner centered */}
              <div className="mt-1 flex justify-center">
                <img
                  src={lifeosBanner}
                  alt="LifeOS"
                  className="h-16 md:h-20 w-auto object-contain select-none lifeos-float"
                  draggable="false"
                />
              </div>

              {/* Greeting centered */}
              <div className="mt-2 text-center text-xs text-stone-600 truncate">
                {greeting}
              </div>

              {/* Subtle divider */}
              <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
            </header>
          </div>

          {/* Sticky tabs */}
          <div className="sticky top-0 z-30 mt-3">
            {/* Less bulky: lighter container */}
            <div className="rounded-3xl border border-black/5 bg-white/45 backdrop-blur shadow-sm">
              <nav className="px-3 py-2">
                <div className="overflow-x-auto no-scrollbar scroll-smooth">
                  {/* Measuring container */}
                  <div ref={navRef} className="relative flex items-center gap-2 min-w-max py-1">
                    {/* Sliding pill highlight */}
                    <div
                      aria-hidden="true"
                      className="absolute top-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white/80 shadow-sm transition-[transform,width,opacity] duration-300 ease-out"
                      style={{
                        transform: `translateX(${indicator.left}px) translateY(-50%)`,
                        width: indicator.width,
                        height: 36,
                        opacity: indicator.ready ? 1 : 0,
                      }}
                    />

                    {tabs.map((t) => (
                      <NavLink
                        key={t.key}
                        to={t.to}
                        end={t.end}
                        className={linkClass}
                        ref={(node) => {
                          if (!node) itemRefs.current.delete(t.key);
                          else itemRefs.current.set(t.key, node);
                        }}
                      >
                        {/* keep text above the pill */}
                        <span className="relative z-10">{t.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </nav>
            </div>
          </div>

          {/* Main content */}
          <main className="mt-4 rounded-3xl border border-black/5 bg-white/70 p-4 md:p-6 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="mt-6 text-center text-xs text-stone-500">
            <div className="rounded-3xl border border-black/5 bg-white/40 px-4 py-4 backdrop-blur">
              <div>✨ Built gently by Melissa Marcelo || 🌸.</div>
              <div className="mt-1">LifeOS — calm progress over pressure.</div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
