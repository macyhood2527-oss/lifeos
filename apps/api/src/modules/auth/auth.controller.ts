import type { Request, Response } from "express";
import { env } from "../../config/env";
import { z } from "zod";
import {
  signAccessToken,
  signPasswordResetToken,
  verifyPasswordResetToken,
} from "./jwt";
import {
  createLocalUser,
  findUserByEmail,
  findUserById,
  findUserCredentialsByEmail,
  updateUserProfileById,
  updateUserPasswordById,
} from "../users/users.service";
import { hashPassword, verifyPassword } from "./password";

const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

const signupSchema = z.object({
  email: z.string().trim().email().max(254),
  password: passwordSchema,
  name: z.string().trim().min(1).max(80).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  reminders_enabled: z.boolean().optional(),
  habit_nudges_enabled: z.boolean().optional(),
  weekly_recap_enabled: z.boolean().optional(),
});

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function fallbackNameFromEmail(email: string) {
  return email.split("@")[0] || "LifeOS User";
}

export async function signupLocal(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid signup payload", details: parsed.error.flatten() });
  }

  const email = normalizeEmail(parsed.data.email);
  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const name = parsed.data.name?.trim() || fallbackNameFromEmail(email);

  const user = await createLocalUser({ email, name, passwordHash });
  const token = signAccessToken({ userId: user.id });

  return res.status(201).json({ token, user });
}

export async function loginLocal(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid login payload" });
  }

  const email = normalizeEmail(parsed.data.email);
  const creds = await findUserCredentialsByEmail(email);

  if (!creds?.password_hash) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await verifyPassword(parsed.data.password, creds.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const user = await findUserById(creds.id);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAccessToken({ userId: user.id });
  return res.json({ token, user });
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid forgot-password payload" });
  }

  const email = normalizeEmail(parsed.data.email);
  const user = await findUserByEmail(email);

  // Do not leak whether an account exists.
  if (user) {
    const token = signPasswordResetToken({ userId: user.id });
    const resetUrl = `${env.WEB_APP_URL}/login?mode=reset&token=${encodeURIComponent(token)}`;

    if (env.NODE_ENV !== "production") {
      console.log(`[auth] Password reset URL for ${email}: ${resetUrl}`);
    }
  }

  return res.json({ ok: true, message: "If the account exists, reset instructions were sent." });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid reset-password payload", details: parsed.error.flatten() });
  }

  try {
    const payload = verifyPasswordResetToken(parsed.data.token);
    if (payload.type !== "password_reset") {
      return res.status(400).json({ error: "Invalid reset token" });
    }

    const user = await findUserById(payload.userId);
    if (!user) return res.status(400).json({ error: "Invalid reset token" });

    const newHash = await hashPassword(parsed.data.password);
    await updateUserPasswordById(user.id, newHash);

    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }
}

export function me(req: Request, res: Response) {
  const user = (req as any).user;
  return res.json({ user });
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

export async function updateProfile(req: Request, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid profile payload", details: parsed.error.flatten() });
  }

  const user = (req as any).user;
  const userId = Number(user?.id);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const patch = {
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
    ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
    ...(parsed.data.reminders_enabled !== undefined ? { reminders_enabled: parsed.data.reminders_enabled } : {}),
    ...(parsed.data.habit_nudges_enabled !== undefined ? { habit_nudges_enabled: parsed.data.habit_nudges_enabled } : {}),
    ...(parsed.data.weekly_recap_enabled !== undefined ? { weekly_recap_enabled: parsed.data.weekly_recap_enabled } : {}),
  };

  const updated = await updateUserProfileById(userId, patch);
  return res.json({ user: updated });
}
