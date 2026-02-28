import { Router } from "express";
import { authRequired } from "../../middleware/authRequired";
import { status, subscribe, unsubscribe, test } from "./push.controller";

const router = Router();

router.get("/status", authRequired, status);
router.post("/subscribe", authRequired, subscribe);
router.delete("/unsubscribe", authRequired, unsubscribe);
router.post("/test", authRequired, test);

export default router;
