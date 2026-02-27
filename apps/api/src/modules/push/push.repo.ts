import { pool } from "../../db/pool";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

export type PushSubscriptionRow = RowDataPacket & {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  last_seen_at: Date;
  created_at: Date;
  updated_at: Date;
};

export async function upsertPushSubscription(params: {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  const { userId, endpoint, p256dh, auth, userAgent } = params;

  // Upsert by unique endpoint
  await pool.execute<ResultSetHeader>(
    `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, last_seen_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      user_agent = VALUES(user_agent),
      last_seen_at = NOW(3),
      updated_at = NOW(3)
    `,
    [userId, endpoint, p256dh, auth, userAgent ?? null]
  );
}

export async function deletePushSubscriptionByEndpoint(userId: number, endpoint: string) {
  const [res] = await pool.execute<ResultSetHeader>(
    `DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?`,
    [userId, endpoint]
  );
  return res.affectedRows > 0;
}

export async function getLatestPushSubscription(userId: number) {
  const [rows] = await pool.query<PushSubscriptionRow[]>(
    `
    SELECT *
    FROM push_subscriptions
    WHERE user_id=?
    ORDER BY last_seen_at DESC, id DESC
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function deletePushSubscriptionById(userId: number, id: number) {
  await pool.execute<ResultSetHeader>(
    `DELETE FROM push_subscriptions WHERE user_id=? AND id=?`,
    [userId, id]
  );
}