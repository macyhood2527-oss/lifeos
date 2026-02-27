import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./push.controller";

export const pushRouter = Router();

pushRouter.use(requireAuth);

pushRouter.get("/vapid-public-key", asyncHandler(controller.getVapidPublicKey));
pushRouter.post("/subscribe", asyncHandler(controller.subscribe));
pushRouter.delete("/unsubscribe", asyncHandler(controller.unsubscribe));

// ✅ only ONE test endpoint
pushRouter.post("/test", asyncHandler(controller.test));