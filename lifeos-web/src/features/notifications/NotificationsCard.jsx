import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../shared/auth/useAuth";
import {
  getExistingSubscription,
  registerServiceWorker,
  subscribePush,
  unsubscribePush,
} from "../../shared/push/pushClient";
import {
  deletePushSubscription,
  getPushStatus,
  savePushSubscription,
  sendTestPush, // optional; if you don't have this, remove its usage below
} from "./notifications.api";

function formatQuietHours(user) {
  const s = user?.quiet_hours_start;
  const e = user?.quiet_hours_end;
  if (!s || !e) return "Quiet hours not set.";
  return `Quiet hours: ${s}–${e} (${user?.timezone || "timezone unknown"})`;
}

function prettyError(e) {
  const status = e?.status;
  const serverMsg = e?.data?.message;

  if (status === 401) return "You’re not logged in. Please log in again.";
  if (status === 403) return "Not allowed.";
  if (status === 404) return "Push endpoints aren’t enabled on the server yet.";
  if (status === 400) return serverMsg || "Server rejected subscription (check VAPID + payload).";
  if (status >= 500) return "Server error while handling notifications.";
  return serverMsg || e?.message || "Something went wrong.";
}

export default function NotificationsCard() {
  const { user } = useAuth();

  const vapidKey = useMemo(() => import.meta.env.VITE_VAPID_PUBLIC_KEY, []);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState("");

  const [serverConfigured, setServerConfigured] = useState(null); // true/false/null unknown
  const [serverSubscribed, setServerSubscribed] = useState(false);

  async function refreshState() {
    setMsg("");

    // Browser capability check
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      setEnabled(false);
      return;
    }

    setSupported(true);
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");

    // If missing VAPID key, we can’t subscribe from the browser
    if (!vapidKey) {
      setEnabled(false);
      setServerConfigured(false);
      setServerSubscribed(false);
      setMsg("Missing VAPID key. Add VITE_VAPID_PUBLIC_KEY in Vercel env and redeploy.");
      return;
    }

    // Ensure SW is ready
    await registerServiceWorker();

    const browserSub = await getExistingSubscription();

    // Ask server status (404 -> not implemented; treat as unknown)
    const server = await getPushStatus().catch((e) => {
      if (e?.status === 404) return null;
      return null;
    });

    if (server && typeof server === "object") {
      if (typeof server.configured === "boolean") setServerConfigured(server.configured);
      if (typeof server.subscribed === "boolean") setServerSubscribed(server.subscribed);
      if (typeof server.enabled === "boolean") setServerSubscribed(server.enabled);
    } else {
      setServerConfigured(null);
      setServerSubscribed(false);
    }

    // Prefer “browser truth” if subscription exists
    const isEnabled = !!browserSub || !!(server && (server.subscribed === true || server.enabled === true));
    setEnabled(isEnabled);
  }

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnable() {
    if (!vapidKey) {
      setMsg("Missing VAPID key. Add VITE_VAPID_PUBLIC_KEY in Vercel env and redeploy.");
      return;
    }

    try {
      setBusy(true);
      setMsg("");

      await registerServiceWorker();

      // This returns a PushSubscription JSON (endpoint + keys)
      const subJson = await subscribePush({ vapidPublicKey: vapidKey });

      // Save to server. Backend should accept either raw sub OR { subscription: sub }
      await savePushSubscription(subJson);

      setMsg("Notifications enabled. We’ll keep it gentle.");
      await refreshState();
    } catch (e) {
      console.error(e);
      setMsg(prettyError(e));
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

      // Tell backend first
      if (endpoint) {
        await deletePushSubscription(endpoint);
      }

      // Then remove from browser
      await unsubscribePush();

      setMsg("Notifications disabled.");
      await refreshState();
    } catch (e) {
      console.error(e);
      setMsg(prettyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    try {
      setBusy(true);
      setMsg("");
      if (!serverConfigured) {
        setMsg("Server push isn’t configured yet (missing VAPID keys on backend).");
        return;
      }
      await sendTestPush?.(); // optional
      setMsg("Test notification requested. Check your device/browser.");
    } catch (e) {
      console.error(e);
      setMsg(prettyError(e));
    } finally {
      setBusy(false);
    }
  }

  const statusLabel = !supported
    ? "Unsupported"
    : enabled
      ? "Enabled"
      : "Disabled";

  const statusClass = !supported
    ? "bg-stone-50 text-stone-700 border-black/10"
    : enabled
      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
      : "bg-stone-50 text-stone-700 border-black/10";

  return (
    <div className="rounded-3xl border border-black/5 bg-white/70 p-4 md:p-6 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-stone-900">Notifications</div>
          <div className="mt-1 text-sm text-stone-600">
            Gentle reminders — respectful of your timezone and quiet hours.
          </div>
          <div className="mt-2 text-xs text-stone-500">{formatQuietHours(user)}</div>

          <div className="mt-2 text-xs text-stone-500">
            Server:{" "}
            <span className="font-medium text-stone-700">
              {serverConfigured === null ? "unknown" : serverConfigured ? "configured" : "not configured"}
            </span>
            {serverConfigured ? (
              <>
                {" "}
                • Subscription:{" "}
                <span className="font-medium text-stone-700">
                  {serverSubscribed ? "saved" : "not saved"}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <span className={`text-xs rounded-xl px-2 py-1 border ${statusClass}`}>
          {statusLabel}
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
              Browser permission:{" "}
              <span className="font-medium text-stone-700">{permission}</span>
            </div>

            <div className="flex flex-wrap gap-2">
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

              <button
                onClick={handleTest}
                disabled={busy || !enabled}
                className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm hover:bg-white/80 disabled:opacity-60"
                title={!enabled ? "Enable notifications first" : "Send a test notification"}
              >
                Test
              </button>
            </div>
          </>
        )}

        {msg ? (
          <div className="rounded-2xl bg-stone-100 p-3 text-sm text-stone-700">
            {msg}
          </div>
        ) : null}
      </div>
    </div>
  );
}
