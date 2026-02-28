import { useEffect, useState } from "react";
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
  sendTestPush,
  getVapidPublicKey,
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
  if (status === 400) return serverMsg || "Server rejected subscription.";
  if (status >= 500) return "Server error while handling notifications.";
  return serverMsg || e?.message || "Something went wrong.";
}

export default function NotificationsCard() {
  const { user } = useAuth();

  const [vapidKey, setVapidKey] = useState("");
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );

  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState("");

  const [serverConfigured, setServerConfigured] = useState(null);
  const [serverSubscribed, setServerSubscribed] = useState(false);

  async function refreshState() {
    setMsg("");

    // Browser support check
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      setEnabled(false);
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    // Fetch VAPID key from backend
    const keyRes = await getVapidPublicKey().catch(() => null);
    const key = keyRes?.publicKey || "";
    setVapidKey(key);

    if (!key) {
      setServerConfigured(false);
      setEnabled(false);
      setMsg("Push not configured on server yet.");
      return;
    }

    await registerServiceWorker();

    const browserSub = await getExistingSubscription();

    const server = await getPushStatus().catch(() => null);

    if (server) {
      setServerConfigured(server.configured);
      setServerSubscribed(server.subscribed);
    } else {
      setServerConfigured(null);
      setServerSubscribed(false);
    }

    const isEnabled = !!browserSub || !!server?.subscribed;
    setEnabled(isEnabled);
  }

  useEffect(() => {
    refreshState();
    // eslint-disable-next-line
  }, []);

  async function handleEnable() {
    try {
      setBusy(true);
      setMsg("");

      if (!vapidKey) {
        setMsg("Push not configured on server.");
        return;
      }

      await registerServiceWorker();

      const subJson = await subscribePush({ vapidPublicKey: vapidKey });

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

      if (endpoint) {
        await deletePushSubscription(endpoint);
      }

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
        setMsg("Server push isn’t configured yet.");
        return;
      }

      await sendTestPush();
      setMsg("Test notification requested. Check your device.");
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
          <div className="text-base font-semibold text-stone-900">
            Notifications
          </div>
          <div className="mt-1 text-sm text-stone-600">
            Gentle reminders — respectful of your timezone and quiet hours.
          </div>
          <div className="mt-2 text-xs text-stone-500">
            {formatQuietHours(user)}
          </div>

          <div className="mt-2 text-xs text-stone-500">
            Server:{" "}
            <span className="font-medium text-stone-700">
              {serverConfigured === null
                ? "unknown"
                : serverConfigured
                ? "configured"
                : "not configured"}
            </span>
            {serverConfigured && (
              <>
                {" "}
                • Subscription:{" "}
                <span className="font-medium text-stone-700">
                  {serverSubscribed ? "saved" : "not saved"}
                </span>
              </>
            )}
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
              <span className="font-medium text-stone-700">
                {permission}
              </span>
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
              >
                Test
              </button>
            </div>
          </>
        )}

        {msg && (
          <div className="rounded-2xl bg-stone-100 p-3 text-sm text-stone-700">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
