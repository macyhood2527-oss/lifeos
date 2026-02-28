import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt";
import { findUserById } from "../users/users.service";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // 1) ✅ JWT auth (works cross-domain, Safari-safe)
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice("Bearer ".length).trim();
      const { userId } = verifyAccessToken(token);

      const user = await findUserById(userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      // attach for controllers
      (req as any).user = user;
      return next();
    }

    // 2) Fallback: session auth (for local dev / dev-login)
    if ((req as any).isAuthenticated && (req as any).isAuthenticated()) return next();

    return res.status(401).json({ error: "Unauthorized" });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
