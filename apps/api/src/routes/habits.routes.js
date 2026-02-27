import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import asyncHandler from "../lib/asyncHandler.js";
import {
  habitsList,
  habitsGet,
  habitsCreate,
  habitsUpdate,
  habitsDelete,
  habitCheckin,
  habitUncheck,
  habitStreak,
} from "../controllers/habits.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(habitsList));
router.post("/", asyncHandler(habitsCreate));

router.get("/:id", asyncHandler(habitsGet));
router.patch("/:id", asyncHandler(habitsUpdate));
router.delete("/:id", asyncHandler(habitsDelete));

router.post("/:id/checkins", asyncHandler(habitCheckin));     // check-in (idempotent)
router.delete("/:id/checkins", asyncHandler(habitUncheck));   // remove check-in

router.get("/:id/streak", asyncHandler(habitStreak));

export default router;