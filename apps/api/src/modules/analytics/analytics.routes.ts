import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import * as controller from "./analytics.controller";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/weekly", asyncHandler(controller.weekly));