import pool from "../db/pool.js";

/**
 * Assumes you have a table `push_subscriptions` like:
 * - id
 * - user_id
 * - endpoint (unique-ish)
 * - p256dh
 * - auth
 * - created_at / updated_at
 *
 * If your columns differ, paste your schema and I’ll align it.
 */

export async function upsertSubscription(userId, sub) {
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    const err = new Error("Invalid subscription object (missing endpoint/keys)");
    err.status = 400;
    throw err;
  }

  // Keep it simple: one row per endpoint per user
  await pool.query(
    `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      updated_at = NOW()
    `,
    [userId, endpoint, p256dh, auth]
  );

  return { endpoint };
}

export async function getLatestSubscription(userId) {
  const [rows] = await pool.query(
    `
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ?
    ORDER BY updated_at DESC, id DESC
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
}

export async function deleteSubscriptionById(userId, id) {
  await pool.query(
    `DELETE FROM push_subscriptions WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
}