import type { Request, Response } from "express";
import { env } from "../../config/env";

export function me(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ user: req.user });
}

export function logout(req: Request, res: Response) {
  // passport 0.6 requires callback
  req.logout((err) => {
    if (err) return res.status(500).json({ error: "Logout failed" });

    req.session.destroy((destroyErr) => {
      if (destroyErr) return res.status(500).json({ error: "Session destroy failed" });

      res.clearCookie(env.SESSION_COOKIE_NAME, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production"
      });

      return res.json({ ok: true });
    });
  });
}