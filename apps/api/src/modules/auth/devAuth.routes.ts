import { Router } from "express";
import { env } from "../../config/env";
import { pool } from "../../db/pool";
import type { ResultSetHeader } from "mysql2/promise";
import { findUserById } from "../users/users.service";

export const devAuthRouter = Router();

/**
 * DEV ONLY.
 * Creates (if needed) a local dev user and logs them in via session.
 */
devAuthRouter.post("/dev-login", async (req, res, next) => {
  try {
    if (env.NODE_ENV !== "development") {
      return res.status(404).json({ error: "Not found" });
    }

    const email = "dev@lifeos.local";
    const googleId = "dev-google-id";
    const name = "LifeOS Dev User";

    // Find by email
    const [rows] = await pool.query<any[]>(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    let userId: number;

    if (rows[0]?.id) {
      userId = Number(rows[0].id);
    } else {
      const [result] = await pool.execute<ResultSetHeader>(
        `INSERT INTO users (google_id, email, name, avatar_url, timezone, tone, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 'Asia/Manila', 'gentle', NOW(3), NOW(3))`,
        [googleId, email, name]
      );
      userId = Number(result.insertId);
    }

    const user = await findUserById(userId);
    if (!user) return res.status(500).json({ error: "Dev user missing" });

    // Passport-style login (works because passport.session() is enabled)
    req.login(user, (err) => {
      if (err) return next(err);
      return res.json({ ok: true, user });
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DEV ONLY.
 * Clears session.
 */
devAuthRouter.post("/dev-logout", async (req, res, next) => {
  try {
    if (env.NODE_ENV !== "development") {
      return res.status(404).json({ error: "Not found" });
    }

    req.logout((err) => {
      if (err) return next(err);

      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        return res.json({ ok: true });
      });
    });
  } catch (err) {
    next(err);
  }
});