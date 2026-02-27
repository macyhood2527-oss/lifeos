import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./projects.controller";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.post("/", asyncHandler(controller.create));
projectsRouter.get("/", asyncHandler(controller.list));
projectsRouter.get("/:id", asyncHandler(controller.getOne));
projectsRouter.patch("/:id", asyncHandler(controller.patch));
projectsRouter.delete("/:id", asyncHandler(controller.remove));