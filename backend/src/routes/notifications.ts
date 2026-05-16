import { Router } from "express";
import { auth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController";

const router = Router();

router.get("/", auth, asyncHandler(listNotifications));
router.patch("/read-all", auth, asyncHandler(markAllNotificationsRead));
router.patch("/:id/read", auth, asyncHandler(markNotificationRead));

export default router;
