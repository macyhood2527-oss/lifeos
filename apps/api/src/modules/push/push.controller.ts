import type { Request, Response } from "express";
import { env } from "../../config/env";
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
      error: "Push notifications are not configured yet.",
      details: getWebPushConfigError(),
    });
  }
  return null;
}

function getUserId(req: Request) {
  return (req as any).user.id as number;
}

export async function getVapidPublicKey(_req: Request, res: Response) {
  const blocked = requirePushReady(res);
  if (blocked) return;

  res.json({ publicKey: env.VAPID_PUBLIC_KEY });
}

export async function subscribe(req: Request, res: Response) {
  const blocked = requirePushReady(res);
  if (blocked) return;

  const sub = req.body;

  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription object." });
  }

  const userId = getUserId(req);
  const userAgent = req.get("user-agent") ?? null;

  await upsertSubscription(userId, sub, userAgent);

  return res.status(201).json({ ok: true });
}

export async function unsubscribe(req: Request, res: Response) {
  const userId = getUserId(req);
  const endpoint = req.body?.endpoint;

  if (!endpoint) return res.status(400).json({ error: "endpoint is required" });

  const removed = await removeSubscription(userId, endpoint);
  return res.json({ ok: true, removed });
}

export async function test(req: Request, res: Response) {
  const blocked = requirePushReady(res);
  if (blocked) return;

  const userId = getUserId(req);

  const row = await getLatestSubscription(userId);
  if (!row) return res.status(404).json({ error: "No subscription found. Subscribe first." });

  const subscription = {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };

  try {
    await sendTestPush(subscription);
    return res.json({ ok: true });
  } catch (err: any) {
    const status = err?.statusCode || err?.status || 500;

    // subscription expired/invalid → cleanup so user can re-subscribe cleanly
    if (status === 404 || status === 410) {
      await removeSubscriptionById(userId, row.id);
      return res.status(410).json({
        error: "Subscription expired/invalid. Please re-subscribe.",
        cleanedUp: true,
      });
    }

    return res.status(status).json({
      error: "Failed to send push",
      details: err?.message || String(err),
    });
  }
}