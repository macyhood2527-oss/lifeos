import usePWAInstall from "../hooks/usePWAInstall";

export default function InstallAppFloating() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  // don’t show if installed OR not installable
  if (isInstalled || !isInstallable) return null;

  return (
    <div className="fixed left-3 top-3 z-[60]">
      <button
        type="button"
        onClick={install}
        className={[
          "group flex items-center gap-2 rounded-2xl border border-black/10",
          "bg-white/70 px-3 py-2 text-xs font-medium text-stone-800",
          "shadow-sm backdrop-blur-md transition",
          "hover:bg-white/85 active:scale-[0.98]",
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
    </div>
  );
}
