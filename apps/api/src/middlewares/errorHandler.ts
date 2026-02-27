import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("❌ Error:", err);

  const status = typeof err?.status === "number" ? err.status : 500;
  const message =
    status >= 500 ? "Internal server error" : (err?.message ?? "Request failed");

  res.status(status).json({ error: message });
}