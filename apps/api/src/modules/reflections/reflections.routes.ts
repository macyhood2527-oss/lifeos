import { Router } from "express";
import { requireAuth } from "../auth/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import * as controller from "./reflections.controller";

export const reflectionsRouter = Router();

reflectionsRouter.use(requireAuth);

reflectionsRouter.get("/today", asyncHandler(controller.getToday));
reflectionsRouter.put("/today", asyncHandler(controller.upsertToday));
reflectionsRouter.put("/:date", asyncHandler(controller.upsertByDate));

// ✅ ADD THIS (list endpoint) — NOTE: must be BEFORE "/:date"
reflectionsRouter.get("/", asyncHandler(controller.list));
reflectionsRouter.delete("/", asyncHandler(controller.removeAll));

reflectionsRouter.get("/:date", asyncHandler(controller.getByDate));
