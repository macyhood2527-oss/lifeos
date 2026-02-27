import { webpush, configureWebPush, isWebPushConfigured, getWebPushConfigError } from "../../config/webpush";

export async function sendTestPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  configureWebPush();

  if (!isWebPushConfigured()) {
    const err = new Error(getWebPushConfigError() || "Web Push not configured");
    (err as any).status = 503;
    throw err;
  }

  const payload = {
    title: "LifeOS",
    body: "Gentle ping 🌿 Push is working.",
    tag: "lifeos-test",
    url: "/",
  };

  return webpush.sendNotification(subscription as any, JSON.stringify(payload));
}