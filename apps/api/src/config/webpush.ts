import webpush from "web-push";
import { env } from "./env";

let configured = false;
let configError: string | null = null;

function isNonEmpty(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

/**
 * Safe config:
 * - If keys are missing/invalid: don't crash server.
 * - Store an error so routes can respond nicely.
 */
export function configureWebPush() {
  if (configured) return;

  const subject = env.VAPID_SUBJECT;
  const pub = env.VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;

  // If any are missing, just mark as "not configured"
  if (!isNonEmpty(subject) || !isNonEmpty(pub) || !isNonEmpty(priv)) {
    configError = "Web Push is not configured (missing VAPID env vars).";
    return;
  }

  try {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
    configError = null;
  } catch (err: any) {
    // Don't crash startup — store error message instead
    configError = err?.message || "Invalid VAPID configuration.";
  }
}

export function isWebPushConfigured() {
  // Ensure we attempted config at least once
  if (!configured && configError === null) configureWebPush();
  return configured;
}

export function getWebPushConfigError() {
  if (!configured && configError === null) configureWebPush();
  return configError;
}

export { webpush };