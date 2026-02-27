import { Router } from "express";
import passport from "passport";
import { env } from "../../config/env";
import { authRateLimit } from "../../middlewares/rateLimit";
import { me, logout } from "./auth.controller";
import { requireAuth } from "./auth.middleware";

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
  (_req, res) => {
    // After login, redirect to web
    res.redirect(`${env.WEB_APP_URL}/`);
  }
);

// Current session user
authRouter.get("/me", requireAuth, me);

// Logout
authRouter.post("/logout", requireAuth, logout);