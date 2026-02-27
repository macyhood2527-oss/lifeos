import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../shared/auth/useAuth";
import {
  getExistingSubscription,
  registerServiceWorker,
  subscribePush,
  unsubscribePush,
} from "../../shared/push/pushClient";
import { deletePushSubscription, getPushStatus, savePushSubscription } from "./notifications.api";

function formatQuietHours(user) {
  const s = user?.quiet_hours_start;
  const e = user?.quiet_hours_end;
  if (!s || !e) return "Quiet hours not set.";
  return `Quiet hours: ${s}–${e} (${user?.timezone || "timezone unknown"})`;
}

export default function NotificationsCard() {
  const { user } = useAuth();

  const vapidKey = useMemo(() => import.meta.env.VITE_VAPID_PUBLIC_KEY, []);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState(() => (typeof Notification !== "undefined" ? Notification.permission : "default"));
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState("");

  async function refreshState() {
    setMsg("");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      setEnabled(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    // Ensure SW is ready
    await registerServiceWorker();

    const browserSub = await getExistingSubscription();
    const server = await getPushStatus().catch(() => null);

    // Prefer “browser truth” if subscription exists
    const isEnabled =
      !!browserSub ||
      !!(server && (server.enabled === true || server.subscribed === true));

    setEnabled(isEnabled);
  }

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnable() {
    if (!vapidKey) {
      setMsg("Missing VAPID key. Add VITE_VAPID_PUBLIC_KEY to your .env and restart Vite.");
      return;
    }

    try {
      setBusy(true);
      setMsg("");

      await registerServiceWorker();

      const subJson = await subscribePush({ vapidPublicKey: vapidKey });
      await savePushSubscription(subJson);

      setMsg("Notifications enabled. We’ll keep it gentle.");
      await refreshState();
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "Could not enable notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    try {
      setBusy(true);
      setMsg("");

      const browserSub = await getExistingSubscription();
      const endpoint = browserSub?.endpoint;

      // Tell backend first (so it stops scheduling/sending)
      if (endpoint) {
        await deletePushSubscription(endpoint);
      }

      // Then remove from browser
      await unsubscribePush();

      setMsg("Notifications disabled.");
      await refreshState();
    } catch (e) {
      console.error(e);
      setMsg(e?.message || "Could not disable notifications.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 p-4 md:p-6 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-stone-900">Notifications</div>
          <div className="mt-1 text-sm text-stone-600">
            Gentle reminders — respectful of your timezone and quiet hours.
          </div>
          <div className="mt-2 text-xs text-stone-500">{formatQuietHours(user)}</div>
        </div>

        <span
          className={`text-xs rounded-xl px-2 py-1 border ${
            enabled
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-stone-50 text-stone-700 border-black/10"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {!supported ? (
          <div className="rounded-2xl bg-stone-100 p-3 text-sm text-stone-700">
            Push notifications aren’t supported in this browser.
          </div>
        ) : (
          <>
            <div className="text-xs text-stone-500">
              Browser permission: <span className="font-medium text-stone-700">{permission}</span>
            </div>

            <div className="flex gap-2">
              {!enabled ? (
                <button
                  onClick={handleEnable}
                  disabled={busy}
                  className="rounded-2xl border border-black/10 bg-emerald-50 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-60"
                >
                  {busy ? "Enabling…" : "Enable notifications"}
                </button>
              ) : (
                <button
                  onClick={handleDisable}
                  disabled={busy}
                  className="rounded-2xl border border-black/10 bg-rose-50 px-4 py-2 text-sm text-rose-900 hover:bg-rose-100 disabled:opacity-60"
                >
                  {busy ? "Disabling…" : "Disable"}
                </button>
              )}

              <button
                onClick={refreshState}
                disabled={busy}
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-white/80 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </>
        )}

        {msg ? (
          <div className="rounded-2xl bg-stone-100 p-3 text-sm text-stone-700">{msg}</div>
        ) : null}
      </div>
    </div>
  );
}