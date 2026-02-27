import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./habits.controller";

export const habitsRouter = Router();
habitsRouter.use(requireAuth);

habitsRouter.post("/", asyncHandler(controller.create));
habitsRouter.get("/", asyncHandler(controller.list));
habitsRouter.patch("/:id", asyncHandler(controller.patch));
habitsRouter.delete("/:id", asyncHandler(controller.remove));

habitsRouter.post("/:id/checkins", asyncHandler(controller.checkin));
habitsRouter.delete("/:id/checkins/latest", asyncHandler(controller.undo));
habitsRouter.get("/:id/streak", asyncHandler(controller.streak));