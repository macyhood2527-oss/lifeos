import webpush from "web-push";

function mustGetEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let configured = false;

export function ensureWebPushConfigured() {
  if (configured) return;

  const publicKey = mustGetEnv("VAPID_PUBLIC_KEY");
  const privateKey = mustGetEnv("VAPID_PRIVATE_KEY");
  const subject = mustGetEnv("VAPID_SUBJECT");

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function getVapidPublicKey() {
  return mustGetEnv("VAPID_PUBLIC_KEY");
}

export async function sendPush({ subscription, payload }) {
  ensureWebPushConfigured();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
}