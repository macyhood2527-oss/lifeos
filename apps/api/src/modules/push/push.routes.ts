import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./push.controller";
import { env } from "../../config/env";
import { authRequired } from "../../middleware/authRequired"; // whatever you use
import { pool } from "../../db/pool";

export const pushRouter = Router();
const router = Router();

pushRouter.use(requireAuth);
function pushConfigured() {
  return Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_EMAIL);
}

pushRouter.get("/vapid-public-key", asyncHandler(controller.getVapidPublicKey));
pushRouter.post("/subscribe", asyncHandler(controller.subscribe));
pushRouter.delete("/unsubscribe", asyncHandler(controller.unsubscribe));
// ✅ Status endpoint (fixes 404)
router.get("/status", authRequired, async (req, res) => {
  return res.json({
    configured: pushConfigured(),
    publicKeyPresent: Boolean(env.VAPID_PUBLIC_KEY),
  });
});

// ✅ only ONE test endpoint
pushRouter.post("/test", asyncHandler(controller.test));
// ✅ Subscribe endpoint (fixes 400 by validating input)
router.post("/subscribe", authRequired, async (req, res) => {
  if (!pushConfigured()) {
    return res.status(400).json({
      message: "Push not configured on server (missing VAPID keys).",
    });
  }

  const subscription = req.body?.subscription ?? req.body; // supports either shape
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return res.status(400).json({
      message: "Invalid push subscription payload.",
      expected: { endpoint: "...", keys: { p256dh: "...", auth: "..." } },
    });
  }

  const userId = (req as any).user?.id ?? (req as any).userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  // Minimal: store one subscription per user (replace existing)
  await pool.query(
    `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, NOW(3))
    ON DUPLICATE KEY UPDATE
      endpoint=VALUES(endpoint),
      p256dh=VALUES(p256dh),
      auth=VALUES(auth)
    `,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
  );

  return res.json({ ok: true });
});

export default router;
