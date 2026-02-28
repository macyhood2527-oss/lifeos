import type { Request, Response } from "express";
import { configureWebPush, getWebPushConfigError, isWebPushConfigured } from "../../config/webpush";

import {
  upsertSubscription,
  removeSubscription,
  getLatestSubscription,
  removeSubscriptionById,
} from "./push.service";

import { sendTestPush } from "./webpush.service";

function requirePushReady(res: Response) {
  configureWebPush();
  if (!isWebPushConfigured()) {
    return res.status(503).json({
      message: "Push notifications are not configured yet.",
      details: getWebPushConfigError(),
      configured: false,
    });
  }
  return null;
}

function getUserId(req: Request) {
  return (req as any).user?.id as number;
}

export async function status(req: Request, res: Response) {
  configureWebPush();
  const userId = getUserId(req);
  const latest = userId ? await getLatestSubscription(userId) : null;

  return res.json({
    configured: isWebPushConfigured(),
    subscribed: Boolean(latest),
  });
}

export async function subscribe(req: Request, res: Response) {
  const blocked = requirePushReady(res);
  if (blocked) return;

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

 const sub = req.body?.subscription ?? req.body;

if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
  return res.status(400).json({
    error: "Invalid subscription object.",
    debug: {
      gotBodyKeys: req.body ? Object.keys(req.body) : null,
      gotSubKeys: sub ? Object.keys(sub) : null,
      hasEndpoint: Boolean(sub?.endpoint),
      hasKeys: Boolean(sub?.keys),
      hasP256dh: Boolean(sub?.keys?.p256dh),
      hasAuth: Boolean(sub?.keys?.auth),
    },
  });
}
 await upsertSubscription(userId, sub, userAgent);
  return res.status(201).json({ ok: true });
}

export async function unsubscribe(req: Request, res: Response) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const endpoint = req.body?.endpoint;
  if (!endpoint) return res.status(400).json({ message: "endpoint is required" });

  const removed = await removeSubscription(userId, endpoint);
  return res.json({ ok: true, removed });
}

export async function test(req: Request, res: Response) {
  const blocked = requirePushReady(res);
  if (blocked) return;

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const row = await getLatestSubscription(userId);
  if (!row) return res.status(404).json({ message: "No subscription found. Subscribe first." });

  const subscription = {
    endpoint: row.endpoint,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };

  try {
    await sendTestPush(subscription);
    return res.json({ ok: true });
  } catch (err: any) {
    const statusCode = err?.statusCode || err?.status || 500;

    if (statusCode === 404 || statusCode === 410) {
      await removeSubscriptionById(userId, row.id);
      return res.status(410).json({
        message: "Subscription expired/invalid. Please re-subscribe.",
        cleanedUp: true,
      });
    }

    return res.status(statusCode).json({
      message: "Failed to send push",
      details: err?.message || String(err),
    });
  }
}
