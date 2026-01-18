import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import {
  getActivityLogs,
  getActivityLogById,
} from "../controllers/activityLogController";

const router = Router();

router.get("/", auth, asyncHandler(getActivityLogs));
router.get("/:id", auth, asyncHandler(getActivityLogById));

export default router;
