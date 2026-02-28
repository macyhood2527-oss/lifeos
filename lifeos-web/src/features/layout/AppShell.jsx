import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import bgTile from "../../assets/bg-tile.jpg";

const linkBase =
  "relative shrink-0 rounded-2xl px-3 py-2 text-sm transition-all duration-200 ease-out whitespace-nowrap " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 " +
  "active:scale-[0.98]";

function linkClass({ isActive }) {
  return `${linkBase} ${
    isActive
      ? "text-stone-900"
      : "text-stone-700 hover:text-stone-900"
  }`;
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const greeting = user?.name
    ? `Hi, ${user.name} 🌷 small wins, gently.`
    : "Hi 🌷 small wins, gently.";

  // --- animated indicator state ---
  const navRef = useRef(null);
  const itemRefs = useRef(new Map()); // key -> element
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  // map routes -> keys used for refs (consistent)
  const tabs = [
    { key: "today", label: "Today", to: "/" , end: true },
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

  function measure() {
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
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => measure();
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
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/80 via-rose-50/70 to-stone-50/80 backdrop-blur-[1px]">
        <div className="mx-auto max-w-5xl p-4 md:p-6">
          {/* Non-sticky header */}
          <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur shadow-sm">
            <header className="flex items-center justify-between px-4 py-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-stone-900">🍃 LifeOS</div>
                <div className="text-xs text-stone-600 truncate">{greeting}</div>
              </div>

              <button
                onClick={logout}
                className="shrink-0 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm transition hover:bg-white active:scale-[0.98]"
              >
                Logout
              </button>
            </header>
          </div>

          {/* Sticky tabs ONLY */}
          <div className="sticky top-0 z-30 mt-3">
            <div className="rounded-3xl border border-black/5 bg-white/55 backdrop-blur shadow-sm">
              <nav className="px-3 py-2">
                <div className="overflow-x-auto no-scrollbar">
                  {/* this wrapper is the measuring container */}
                  <div ref={navRef} className="relative flex items-center gap-2 min-w-max">
                    {/* Animated pill indicator */}
                    <div
                      aria-hidden="true"
                      className="absolute top-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white/80 shadow-sm transition-[transform,width] duration-300 ease-out"
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
                        // store refs to compute indicator position
                        ref={(node) => {
                          if (!node) {
                            itemRefs.current.delete(t.key);
                          } else {
                            itemRefs.current.set(t.key, node);
                          }
                        }}
                      >
                        {/* text stays above the pill */}
                        <span className="relative z-10">{t.label}</span>

                        {/* subtle active accent line (earthy pastel) */}
                        <span
                          className="pointer-events-none absolute left-3 right-3 -bottom-[6px] h-[3px] rounded-full bg-emerald-200/70 opacity-0 transition-opacity duration-200"
                        />
                      </NavLink>
                    ))}
                  </div>
                </div>
              </nav>
            </div>
          </div>

          <main className="mt-4 rounded-3xl border border-black/5 bg-white/70 p-4 md:p-6 shadow-sm backdrop-blur transition-all duration-300 hover:shadow-md hover:-translate-y-[2px]">
            <Outlet />
          </main>

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
