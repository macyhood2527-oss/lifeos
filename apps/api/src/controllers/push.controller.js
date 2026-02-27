import { upsertSubscription, getLatestSubscription, deleteSubscriptionById } from "../repos/push.repo.js";
import { getVapidPublicKey, sendPush } from "../services/push.service.js";

export async function pushVapidPublicKey(req, res) {
  res.json({ publicKey: getVapidPublicKey() });
}

export async function pushSubscribe(req, res) {
  const userId = req.user.id;
  const sub = req.body;

  const saved = await upsertSubscription(userId, sub);
  res.status(201).json({ ok: true, saved });
}

export async function pushTest(req, res) {
  const userId = req.user.id;

  const row = await getLatestSubscription(userId);
  if (!row) return res.status(404).json({ error: "No push subscription found. Subscribe first." });

  const subscription = {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };

  const payload = {
    title: "LifeOS",
    body: "Gentle ping 🌿 You’re set up for push notifications.",
    url: "/",
    tag: "lifeos-test",
  };

  try {
    await sendPush({ subscription, payload });
    res.json({ ok: true });
  } catch (err) {
    // Common: 410/404 means subscription expired or invalid
    const status = err?.statusCode || err?.status || 500;

    if (status === 404 || status === 410) {
      // delete bad subscription so future tests can work after re-subscribe
      await deleteSubscriptionById(userId, row.id);
      return res.status(410).json({
        error: "Subscription expired/invalid. Please re-subscribe.",
        cleanedUp: true,
      });
    }

    res.status(500).json({
      error: "Failed to send push",
      details: err?.message || String(err),
    });
  }
}