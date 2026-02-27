import { apiFetch } from "../../shared/api/http";

/**
 * ✅ Change these to match your backend routes once you confirm them.
 * Common patterns:
 *  - POST /api/push/subscribe
 *  - POST /api/push/unsubscribe
 *  - GET  /api/push/status
 */
const ROUTES = {
  status: "/api/push/status",
  subscribe: "/api/push/subscribe",
  unsubscribe: "/api/push/unsubscribe",
};

export function getPushStatus() {
  return apiFetch(ROUTES.status);
}

export function savePushSubscription(subscriptionJson) {
  return apiFetch(ROUTES.subscribe, {
    method: "POST",
    body: JSON.stringify({ subscription: subscriptionJson }),
  });
}

export function deletePushSubscription(endpoint) {
  return apiFetch("/api/push/unsubscribe", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}