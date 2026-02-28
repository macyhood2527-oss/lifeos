import jwt from "jsonwebtoken";
import { env } from "../../config/env";

export function signAccessToken(payload: { userId: number }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): { userId: number } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: number };
}
