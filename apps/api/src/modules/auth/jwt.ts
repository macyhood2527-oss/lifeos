import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export function signAccessToken(payload: { userId: number }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): { userId: number } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: number };
}

type PasswordResetPayload = {
  userId: number;
  type: "password_reset";
};

export function signPasswordResetToken(payload: { userId: number }) {
  return jwt.sign({ ...payload, type: "password_reset" } as PasswordResetPayload, env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload {
  return jwt.verify(token, env.JWT_SECRET) as PasswordResetPayload;
}
