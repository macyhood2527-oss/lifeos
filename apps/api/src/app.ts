import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import passport from "passport";

import { env } from "./config/env";
import { corsMiddleware } from "./config/cors";
import { createSessionMiddleware } from "./config/session";
import { configurePassport } from "./config/passport";

import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";

import path from "path";
// Routers (modules)
import { authRouter } from "./modules/auth/auth.routes";
import { devAuthRouter } from "./modules/auth/devAuth.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { tasksRouter } from "./modules/tasks/tasks.routes";
import { todayRouter } from "./modules/today/today.routes";
import { habitsRouter } from "./modules/habits/habits.routes";
import { reflectionsRouter } from "./modules/reflections/reflections.routes";
import { analyticsRouter } from "./modules/analytics/analytics.routes";

import { remindersRouter } from "./modules/reminders/reminders.routes";
import pushRoutes from "./modules/push/push.routes";

export function createApp() {
  const app = express();

  // If behind proxy in prod (Render/Railway/Nginx), set TRUST_PROXY=1
  app.set("trust proxy", env.TRUST_PROXY);

  // Core middleware
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  // Sessions first, then passport
  app.use(createSessionMiddleware());
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Health
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, env: env.NODE_ENV });
  });

  app.use(express.static(path.join(process.cwd(), "public")));
  // Routes
  app.use("/api/auth", authRouter);
  app.use("/api/auth", devAuthRouter);

  app.use("/api/projects", projectsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/today", todayRouter);

  app.use("/api/habits", habitsRouter);
  app.use("/api/reflections", reflectionsRouter);
app.use("/api/push", pushRoutes);
  app.use("/api/analytics", analyticsRouter);

  app.use("/api/reminders", remindersRouter);

  // Errors last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
