import cors from "cors";
import { env } from "./env";

export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN?.replace(/\/$/, ""),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
