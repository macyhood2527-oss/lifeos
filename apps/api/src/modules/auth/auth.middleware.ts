import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt";
import { findUserById } from "../users/users.service";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // ✅ 1) JWT (Safari-safe)
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice("Bearer ".length).trim();
      const { userId } = verifyAccessToken(token);

      const user = await findUserById(userId);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      (req as any).user = user;
      return next();
    }

    // ✅ 2) Session fallback (dev)
    if ((req as any).isAuthenticated && (req as any).isAuthenticated()) return next();

    return res.status(401).json({ error: "Unauthorized" });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
