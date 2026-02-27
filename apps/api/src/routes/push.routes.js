import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import asyncHandler from "../lib/asyncHandler.js";
import { pushVapidPublicKey, pushSubscribe, pushTest } from "../controllers/push.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/public-key", asyncHandler(pushVapidPublicKey));
router.post("/subscribe", asyncHandler(pushSubscribe));
router.post("/test", asyncHandler(pushTest));



export default router;