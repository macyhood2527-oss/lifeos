import { apiFetch } from "../../shared/api/http";

const ROUTES = {
  status: "/api/push/status",
  subscribe: "/api/push/subscribe",
  unsubscribe: "/api/push/unsubscribe",
};

export function getPushStatus() {
  return apiFetch(ROUTES.status);
}

// Accept either:
// - savePushSubscription(subJson)
// - savePushSubscription({ subscription: subJson })
export function savePushSubscription(input) {
  const subscription = input?.subscription ?? input;

  return apiFetch(ROUTES.subscribe, {
    method: "POST",
    body: JSON.stringify({ subscription }),
  });
}

// Backend should accept DELETE with { endpoint }
export function deletePushSubscription(endpoint) {
  return apiFetch(ROUTES.unsubscribe, {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}
