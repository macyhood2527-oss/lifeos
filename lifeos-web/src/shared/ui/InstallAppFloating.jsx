import { useEffect, useState } from "react";
import usePWAInstall from "../hooks/usePWAInstall";

const DISMISS_KEY = "lifeos_pwa_install_dismissed_v1";

export default function InstallAppFloating() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  // don’t show if installed OR not installable OR dismissed
  if (isInstalled || !isInstallable || dismissed) return null;

  return (
    <div className="fixed left-3 top-3 z-[60]">
      <div
        className={[
          "flex items-center gap-2 rounded-2xl border border-black/10",
          "bg-white/70 px-2 py-2 shadow-sm backdrop-blur-md",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={install}
          className={[
            "group flex items-center gap-2 rounded-2xl",
            "px-2 py-1.5 text-xs font-medium text-stone-800",
            "transition hover:bg-white/60 active:scale-[0.98]",
          ].join(" ")}
          title="Install LifeOS"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-800">
            ⬇
          </span>

          <span>Install</span>

          <span className="text-[11px] text-stone-500 group-hover:text-stone-600">
            LifeOS
          </span>
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-xl px-2 py-1 text-xs text-stone-500 hover:bg-white/60 hover:text-stone-700 active:scale-[0.98]"
          title="Dismiss"
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
