(() => {
  const API_BASE = "http://localhost:4000";

  const logEl = document.getElementById("log");
  const log = (msg) => (logEl.textContent += msg + "\n");

  async function api(path, opts = {}) {
    const res = await fetch(API_BASE + path, {
      credentials: "include",
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(json)}`);
    return json;
  }

  document.getElementById("login").addEventListener("click", async () => {
    try {
      log("Logging in via /api/auth/dev-login ...");
      await api("/api/auth/dev-login", { method: "POST", body: JSON.stringify({}) });
      log("✅ Logged in (session cookie set).");
    } catch (e) {
      log("❌ " + e.message);
    }
  });

  document.getElementById("subscribe").addEventListener("click", async () => {
    try {
      log("Registering service worker...");
      const reg = await navigator.serviceWorker.register("/sw.js");

      log("Requesting notification permission...");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Notification permission not granted.");

      log("Fetching VAPID public key...");
      const { publicKey } = await api("/api/push/vapid-public-key");

      log("Subscribing to push...");
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      log("Saving subscription to backend...");
      await api("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
      });

      log("✅ Subscribed + saved.");
    } catch (e) {
      log("❌ " + e.message);
      log("Tip: click Dev Login first, and ensure VAPID keys are valid.");
    }
  });

  document.getElementById("send").addEventListener("click", async () => {
    try {
      log("Calling /api/push/test ...");
      await api("/api/push/test", { method: "POST", body: JSON.stringify({}) });
      log("✅ Sent! You should see a notification now.");
    } catch (e) {
      log("❌ " + e.message);
    }
  });

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  log("✅ push-test.js loaded (if you can read this, CSP is no longer blocking JS).");
})();