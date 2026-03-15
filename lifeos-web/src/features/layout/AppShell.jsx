import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import bgTile from "../../assets/bg-tile.jpg";
import lifeosBanner from "../../assets/lifeos-banner.png";
import InstallAppFloating from "../../shared/ui/InstallAppFloating";
import { applyUiPreferences, loadUiPreferences } from "../../shared/ui/uiPreferences";
import { getReminderSummary } from "../reminders/reminders.api";
import { Icons } from "../../config/icons";
import { prefetchRouteResources } from "../../app/prefetch";

const linkBase =
  "relative shrink-0 rounded-2xl px-3 py-2 text-sm whitespace-nowrap [&_svg]:opacity-85 " +
  "transition-all duration-200 ease-out active:scale-[0.98]";

const mobileNavLinkBase =
  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition-all duration-200 ease-out active:scale-[0.98]";

function linkClass({ isActive }) {
  return `${linkBase} ${
    isActive
      ? "text-stone-900 font-medium"
      : "text-stone-700 hover:text-stone-900"
  }`;
}

function mobileLinkClass({ isActive }) {
  return `${mobileNavLinkBase} ${
    isActive
      ? "bg-white/90 text-stone-900 shadow-sm border border-black/10"
      : "text-stone-700 hover:bg-white/70 hover:text-stone-900"
  }`;
}

function utilityLinkClass(isActive) {
  return [
    "group relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-sm transition-all duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    isActive
      ? "border-black/10 bg-white/85 text-stone-900 shadow-sm"
      : "border-black/5 bg-white/55 text-stone-700 hover:bg-white/75 hover:text-stone-900",
  ].join(" ");
}

const utilityTooltipClass =
  "pointer-events-none absolute right-0 top-full z-20 mt-2 rounded-xl border border-black/10 bg-white/95 px-2 py-1 text-[11px] font-medium text-stone-700 opacity-0 shadow-sm transition-all duration-150 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100";

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const greeting = user?.name
    ? `Hi, ${user.name} 🌷 How are you today?`
    : "Hi 🌷 How are you today?";

  // ----- Tab indicator -----
  const navRef = useRef(null);
  const itemRefs = useRef(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [reminderBadge, setReminderBadge] = useState({ total: 0, due: 0 });

  const primaryTabs = [
    { key: "today", label: "Today", to: "/", end: true, icon: Icons.dashboard },
    { key: "tasks", label: "Tasks", to: "/tasks", icon: Icons.tasks },
    { key: "habits", label: "Habits", to: "/habits", icon: Icons.habits },
    { key: "reflections", label: "Reflect", to: "/reflections", icon: Icons.reflections },
    { key: "analytics", label: "Insights", to: "/analytics", icon: Icons.analytics },
  ];

  const utilityTabs = [
    { key: "reminders", label: "Reminders", shortLabel: "Remind", to: "/reminders", icon: Icons.reminders },
    { key: "settings", label: "Settings", shortLabel: "Settings", to: "/settings", icon: Icons.settings },
  ];

  function activeKeyFromPath(pathname) {
    if (pathname === "/") return "today";
    if (pathname.startsWith("/habits")) return "habits";
    if (pathname.startsWith("/tasks")) return "tasks";
    if (pathname.startsWith("/reminders")) return "reminders";
    if (pathname.startsWith("/reflections")) return "reflections";
    if (pathname.startsWith("/analytics")) return "analytics";
    if (pathname.startsWith("/settings")) return "settings";
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

  // ✅ Memo so it doesn't re-create on every route render
  const installChip = useMemo(() => <InstallAppFloating />, []);

  useEffect(() => {
    applyUiPreferences(loadUiPreferences());
    const onPrefsChanged = () => applyUiPreferences(loadUiPreferences());
    window.addEventListener("lifeos-ui-prefs-changed", onPrefsChanged);
    return () => window.removeEventListener("lifeos-ui-prefs-changed", onPrefsChanged);
  }, []);

  useEffect(() => {
    let alive = true;

    async function refreshReminderBadge() {
      try {
        const summary = await getReminderSummary();
        if (!alive) return;
        setReminderBadge({
          total: Number(summary?.total ?? 0),
          due: Number(summary?.due ?? 0),
        });
      } catch {
        if (alive) setReminderBadge({ total: 0, due: 0 });
      }
    }

    refreshReminderBadge();

    const onChanged = () => refreshReminderBadge();
    window.addEventListener("lifeos-reminders-changed", onChanged);

    return () => {
      alive = false;
      window.removeEventListener("lifeos-reminders-changed", onChanged);
    };
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
      {/* ✅ floating PWA install chip */}
      {installChip}

      {/* Custom animations */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatSoft {
          0% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
          100% { transform: translateY(0); }
        }

        .fade-up {
          animation: fadeUp 600ms ease-out both;
        }

        .float-soft {
          animation: floatSoft 4.5s ease-in-out infinite;
        }
      `}</style>

      <div
        className="min-h-screen backdrop-blur-[1px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, var(--lifeos-bg-from), var(--lifeos-bg-via), var(--lifeos-bg-to))",
        }}
      >
        <div className="mx-auto max-w-5xl pb-40 md:pb-0" style={{ padding: "var(--lifeos-page-pad)" }}>
          {/* ===== HEADER ===== */}
          <div className="relative rounded-3xl border border-black/5 shadow-sm overflow-hidden fade-up">
            {/* Glass gradient base */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/40 to-white/85 backdrop-blur-lg" />

            {/* Extra soft overlay fade */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none" />

            <header className="relative px-4 pt-4 pb-5">
              <div className="flex flex-wrap items-start justify-center gap-2 sm:justify-end">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {utilityTabs.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.to);
                      return (
                        <NavLink
                          key={item.key}
                          to={item.to}
                          className={utilityLinkClass(isActive)}
                          title={item.label}
                          onMouseEnter={() => prefetchRouteResources(item.key)}
                          onFocus={() => prefetchRouteResources(item.key)}
                        >
                        <Icon size={17} strokeWidth={1.75} />
                        <span className={utilityTooltipClass}>
                          {item.label}
                        </span>
                        {item.key === "reminders" && reminderBadge.total > 0 ? (
                          <span
                            className={[
                              "absolute -right-1 -top-1 min-w-[1.25rem] rounded-full border px-1.5 py-0.5 text-center text-[10px] leading-none shadow-sm",
                              reminderBadge.due > 0
                                ? "border-amber-200 bg-amber-50 text-amber-900"
                                : "border-sky-200 bg-sky-50 text-sky-800",
                            ].join(" ")}
                          >
                            {reminderBadge.due > 0 ? `${reminderBadge.due} due` : reminderBadge.total}
                          </span>
                        ) : null}
                      </NavLink>
                    );
                  })}
                </div>
                <button
                  onClick={logout}
                  className="group relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-sm text-stone-700 transition-all duration-200 ease-out hover:bg-white hover:text-stone-900 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                  aria-label="Logout"
                >
                  <Icons.logout size={17} strokeWidth={1.75} aria-hidden="true" />
                  <span className={utilityTooltipClass}>
                    Logout
                  </span>
                </button>
              </div>

              {/* Banner */}
              <div className="mt-2 flex justify-center">
                <img
                  src={lifeosBanner}
                  alt="LifeOS"
                  loading="lazy"
                  decoding="async"
                  className="h-28 w-full object-contain select-none float-soft sm:h-36 md:h-52"
                  draggable="false"
                />
              </div>

              {/* Greeting */}
              <div className="mt-2 px-2 text-center text-xs leading-relaxed text-stone-600 sm:truncate">
                {greeting}
              </div>

              {/* Divider */}
              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
            </header>
          </div>

          {/* ===== TABS ===== */}
          <div className="sticky top-0 z-30 mt-4 hidden md:block">
            <div className="rounded-3xl border border-black/5 bg-white/45 backdrop-blur shadow-sm">
              <nav className="px-3 py-2">
                <div className="overflow-x-auto no-scrollbar scroll-smooth">
                  <div ref={navRef} className="relative flex items-center gap-2 min-w-max py-1">
                    {/* Sliding highlight */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white/80 shadow-sm transition-all duration-300 ease-out"
                      style={{
                        transform: `translateX(${indicator.left}px) translateY(-50%)`,
                        width: indicator.width,
                        height: 36,
                        opacity: indicator.ready ? 1 : 0,
                      }}
                    />

                    {primaryTabs.map((t) => {
                      const Icon = t.icon;
                      return (
                        <NavLink
                          key={t.key}
                          to={t.to}
                          end={t.end}
                          className={linkClass}
                          onMouseEnter={() => prefetchRouteResources(t.key)}
                          onFocus={() => prefetchRouteResources(t.key)}
                          ref={(node) => {
                            if (!node) itemRefs.current.delete(t.key);
                            else itemRefs.current.set(t.key, node);
                          }}
                          title={t.label}
                        >
                          <span className="relative z-10 inline-flex items-center gap-2">
                            <Icon size={18} strokeWidth={1.75} className="hidden md:block" />
                            <Icon size={20} strokeWidth={1.75} className="md:hidden" />
                            <span className="hidden md:inline">{t.label}</span>
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </nav>
            </div>
          </div>

          {/* ===== MAIN ===== */}
          <main className="mt-6" style={{ marginTop: "var(--lifeos-stack-gap)" }}>
            <Outlet />
          </main>

          {/* ===== FOOTER ===== */}
        {/* ===== FOOTER ===== */}
<footer className="mt-6 text-center text-xs text-stone-500 md:mb-0">
  <div className="rounded-3xl border border-black/5 bg-white/40 px-4 py-5 backdrop-blur">
    <div>
      ✨ Built gently by{" "}
      <NavLink
        to="/about-me"
        className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700 transition"
      >
        Melissa Marcelo
      </NavLink>{" "}
      🌸
    </div>
    <div className="mt-1">LifeOS. calm progress over pressure.</div>

    {/* Divider */}
    <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />

    {/* Links */}
    <div className="flex flex-wrap justify-center items-center gap-3 text-[11px]">
      <NavLink
        to="/privacy"
        className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700 transition"
      >
        Privacy
      </NavLink>

      <span className="text-stone-400">•</span>

      <NavLink
        to="/faqs"
        className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700 transition"
      >
        FAQs
      </NavLink>

      <span className="text-stone-400">•</span>

      <NavLink
        to="/terms"
        className="underline decoration-black/20 hover:decoration-black/40 hover:text-stone-700 transition"
      >
        Terms
      </NavLink>
    </div>
  </div>
</footer>
        </div>

      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
        <div className="mx-auto max-w-5xl rounded-[1.75rem] border border-black/5 bg-white/75 shadow-lg backdrop-blur-xl">
          <nav className="grid grid-cols-5 gap-2 px-3 py-3">
            {primaryTabs.map((t) => {
              const Icon = t.icon;
              return (
                <NavLink
                  key={t.key}
                  to={t.to}
                  end={t.end}
                  className={mobileLinkClass}
                  onMouseEnter={() => prefetchRouteResources(t.key)}
                  onFocus={() => prefetchRouteResources(t.key)}
                  title={t.label}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span className="max-w-full truncate text-[11px] font-medium leading-none">{t.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
