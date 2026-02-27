import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../shared/auth/useAuth";
import bgTile from "../../assets/bg-tile.jpg";

const linkBase =
  "shrink-0 rounded-2xl px-3 py-2 text-sm transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-sm border border-transparent whitespace-nowrap";

const link = ({ isActive }) =>
  `${linkBase} ${
    isActive
      ? "bg-white/80 border-black/10 text-stone-900 shadow-sm"
      : "bg-white/40 text-stone-700 hover:bg-white/70 hover:border-black/5"
  }`;

export default function AppShell() {
  const { user, logout } = useAuth();

  const greeting = user?.name
    ? `Hi, ${user.name} 🌷 small wins, gently.`
    : "Hi 🌷 small wins, gently.";

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
                {/* Collapsed greeting (single line) */}
                <div className="text-xs text-stone-600 truncate">{greeting}</div>
              </div>

              <button
                onClick={logout}
                className="shrink-0 rounded-2xl border border-black/10 bg-white/80 px-3 py-2 text-sm transition hover:bg-white"
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
                  <div className="flex items-center gap-2 min-w-max">
                    <NavLink to="/" end className={link}>
                      Today
                    </NavLink>
                    <NavLink to="/habits" className={link}>
                      Habits
                    </NavLink>
                    <NavLink to="/tasks" className={link}>
                      Tasks
                    </NavLink>
                    <NavLink to="/reflections" className={link}>
                      Reflections
                    </NavLink>
                    <NavLink to="/analytics" className={link}>
                      Analytics
                    </NavLink>
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
    <div>
      ✨ Built gently by Melissa Marcelo || 🌸.
    </div>
    <div className="mt-1">
      LifeOS — calm progress over pressure.
    </div>
  </div>
</footer>
        </div>
      </div>
    </div>
  );
}