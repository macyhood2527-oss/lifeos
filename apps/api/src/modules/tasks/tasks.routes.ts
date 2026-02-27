import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./tasks.controller";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.post("/", asyncHandler(controller.create));
tasksRouter.get("/", asyncHandler(controller.list));
tasksRouter.patch("/:id", asyncHandler(controller.patch));
tasksRouter.delete("/:id", asyncHandler(controller.remove));