import { apiFetch } from "../../shared/api/http";

const ROUTES = {
  status: "/api/push/status",
  subscribe: "/api/push/subscribe",
  unsubscribe: "/api/push/unsubscribe",
  vapidPublicKey: "/api/push/vapid-public-key",
  test: "/api/push/test",
};

export function getPushStatus() {
  return apiFetch(ROUTES.status);
}

export function getVapidPublicKey() {
  return apiFetch(ROUTES.vapidPublicKey);
}

export function savePushSubscription(subscriptionJson) {
  return apiFetch(ROUTES.subscribe, {
    method: "POST",
    body: JSON.stringify({ subscription: subscriptionJson }),
  });
}

export function deletePushSubscription(endpoint) {
  return apiFetch(ROUTES.unsubscribe, {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export function sendTestPush() {
  return apiFetch(ROUTES.test, { method: "POST" });
}
