import { Router } from "express";
import { authRequired } from "../../middleware/authRequired";
import { status, subscribe, unsubscribe, test, getVapidPublicKey } from "./push.controller";

const router = Router();

router.get("/status", authRequired, status);
router.get("/vapid-public-key", authRequired, getVapidPublicKey); // optional
router.post("/subscribe", authRequired, subscribe);
router.delete("/unsubscribe", authRequired, unsubscribe);
router.post("/test", authRequired, test);

export default router;
