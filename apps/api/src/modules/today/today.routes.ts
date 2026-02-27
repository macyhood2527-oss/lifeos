import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import { today } from "./today.controller";

export const todayRouter = Router();

todayRouter.get("/", requireAuth, asyncHandler(today));