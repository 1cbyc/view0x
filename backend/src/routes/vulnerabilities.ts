import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from "../controllers/vulnerabilityController";

const router = Router();

// All vulnerability comment routes require authentication
router.post("/:vulnerabilityId/comments", auth, asyncHandler(createComment));
router.get("/:vulnerabilityId/comments", auth, asyncHandler(getComments));
router.put("/comments/:commentId", auth, asyncHandler(updateComment));
router.delete("/comments/:commentId", auth, asyncHandler(deleteComment));

export default router;
