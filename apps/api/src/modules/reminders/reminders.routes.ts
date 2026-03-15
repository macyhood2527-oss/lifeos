import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./reminders.controller";

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.get("/", asyncHandler(controller.list));
remindersRouter.get("/summary", asyncHandler(controller.summary));
remindersRouter.post("/", asyncHandler(controller.create));
remindersRouter.delete("/", asyncHandler(controller.removeAll));
remindersRouter.patch("/:id", asyncHandler(controller.patch));
remindersRouter.delete("/:id", asyncHandler(controller.remove));
remindersRouter.post("/:id/handle-today", asyncHandler(controller.handleToday));

// ✅ NEW: send-now
remindersRouter.post("/:id/send-now", asyncHandler(controller.sendNow));
