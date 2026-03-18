import { pool } from "../../db/pool";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { env } from "../../config/env";

type SubRow = RowDataPacket & {
  id: number;
  user_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export async function upsertSubscription(
  userId: number,
  input: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string | null }
) {
  const fullValues = [userId, input.endpoint, input.keys.p256dh, input.keys.auth, input.userAgent ?? null];
  const legacyValues = [userId, input.endpoint, input.keys.p256dh, input.keys.auth];

  if (env.DB_PROVIDER === "postgres") {
    await pool.execute<ResultSetHeader>(
      `
      INSERT INTO push_subscriptions
        (user_id, endpoint, p256dh, auth, user_agent, last_seen_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3), NOW(3))
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id=EXCLUDED.user_id,
        p256dh=EXCLUDED.p256dh,
        auth=EXCLUDED.auth,
        user_agent=EXCLUDED.user_agent,
        last_seen_at=NOW(3),
        updated_at=NOW(3)
      `,
      fullValues
    );
  } else {
  // Support both legacy and current push_subscriptions schemas.
    try {
      await pool.execute<ResultSetHeader>(
        `
        INSERT INTO push_subscriptions
          (user_id, endpoint, p256dh, auth, user_agent, last_seen_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3), NOW(3))
        ON DUPLICATE KEY UPDATE
          user_id=VALUES(user_id),
          p256dh=VALUES(p256dh),
          auth=VALUES(auth),
          user_agent=VALUES(user_agent),
          last_seen_at=NOW(3),
          updated_at=NOW(3)
        `,
        fullValues
      );
    } catch (err: any) {
      // Fallback for older schema without user_agent/last_seen_at/updated_at columns.
      const code = err?.code;
      if (code !== "ER_BAD_FIELD_ERROR" && code !== "ER_NO_DEFAULT_FOR_FIELD") {
        throw err;
      }

      await pool.execute<ResultSetHeader>(
        `
        INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
        VALUES (?, ?, ?, ?, NOW(3))
        ON DUPLICATE KEY UPDATE
          user_id=VALUES(user_id),
          p256dh=VALUES(p256dh),
          auth=VALUES(auth)
        `,
        legacyValues
      );
    }
  }

  const [rows] = await pool.query<SubRow[]>(
    `SELECT * FROM push_subscriptions WHERE user_id=? AND endpoint=? LIMIT 1`,
    [userId, input.endpoint]
  );

  return rows[0] ?? null;
}

export async function removeSubscription(userId: number, endpoint: string) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM push_subscriptions WHERE user_id=? AND endpoint=?`,
    [userId, endpoint]
  );
  return result.affectedRows > 0;
}

export async function listSubscriptions(userId: number) {
  const [rows] = await pool.query<SubRow[]>(
    `SELECT * FROM push_subscriptions WHERE user_id=? ORDER BY id DESC`,
    [userId]
  );
  return rows;
}

export async function getLatestSubscription(userId: number) {
  const [rows] = await pool.query<SubRow[]>(
    `
    SELECT *
    FROM push_subscriptions
    WHERE user_id=?
    ORDER BY id DESC
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function removeSubscriptionById(userId: number, id: number) {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM push_subscriptions WHERE user_id=? AND id=?`,
    [userId, id]
  );
  return result.affectedRows > 0;
}
