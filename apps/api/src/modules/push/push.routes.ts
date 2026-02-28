import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireAuth } from "../auth/auth.middleware";
import * as controller from "./push.controller";

const router = Router();

// all push routes require login
router.use(requireAuth);

// ✅ used by frontend (fixes 404)
router.get("/status", asyncHandler(controller.status));

// ✅ used by frontend
router.post("/subscribe", asyncHandler(controller.subscribe));
router.delete("/unsubscribe", asyncHandler(controller.unsubscribe));

// optional helper endpoints
router.get("/vapid-public-key", asyncHandler(controller.getVapidPublicKey));
router.post("/test", asyncHandler(controller.test));

export default router;
