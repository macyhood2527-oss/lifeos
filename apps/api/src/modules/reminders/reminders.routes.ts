import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./reminders.controller";

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.get("/", asyncHandler(controller.list));
remindersRouter.post("/", asyncHandler(controller.create));
remindersRouter.patch("/:id", asyncHandler(controller.patch));
remindersRouter.delete("/:id", asyncHandler(controller.remove));

// ✅ NEW: send-now
remindersRouter.post("/:id/send-now", asyncHandler(controller.sendNow));