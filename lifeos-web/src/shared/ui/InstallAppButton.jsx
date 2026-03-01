import usePWAInstall from "../hooks/usePWAInstall";

export default function InstallAppButton() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  if (isInstalled) {
    return (
      <div className="text-xs text-emerald-700">
        Installed ✓
      </div>
    );
  }

  if (!isInstallable) return null;

  return (
    <button
      onClick={install}
      className="rounded-2xl border border-black/10 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 hover:bg-emerald-100 active:scale-[0.98] transition"
    >
      Install LifeOS
    </button>
  );
}
