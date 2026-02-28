import { Router } from "express";
import passport from "passport";
import { env } from "../../config/env";
import { authRateLimit } from "../../middlewares/rateLimit";
import { me, logout } from "./auth.controller";
import { requireAuth } from "./auth.middleware";
import { signAccessToken } from "./jwt"; // add this import

export const authRouter = Router();

// Start Google auth
authRouter.get(
  "/google",
  authRateLimit,
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })
);

// Callback


authRouter.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${env.WEB_APP_URL}/login?error=oauth` }),
  (req, res) => {
    // passport puts user on req.user
    const u = req.user as any;
    const token = signAccessToken({ userId: u.id });

    // ✅ send token to frontend via hash (not query)
    res.redirect(`${env.WEB_APP_URL}/auth/callback#token=${token}`);
  }
);

// Current session user
authRouter.get("/me", requireAuth, me);

// Logout
authRouter.post("/logout", requireAuth, logout);
