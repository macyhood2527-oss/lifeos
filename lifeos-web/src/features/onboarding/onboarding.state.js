const ONBOARDING_KEY_PREFIX = "lifeos_onboarding_complete";

function makeKey(userId) {
  return `${ONBOARDING_KEY_PREFIX}:${userId}`;
}

export function isOnboardingComplete(userId) {
  if (typeof window === "undefined" || !userId) return false;
  return window.localStorage.getItem(makeKey(userId)) === "1";
}

export function markOnboardingComplete(userId) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(makeKey(userId), "1");
}
