import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import {
  createWebhook,
  getWebhooks,
  deleteWebhook,
} from "../controllers/webhookController";

const router = Router();

router.use(auth);

router.post("/", asyncHandler(createWebhook));
router.get("/", asyncHandler(getWebhooks));
router.delete("/:id", asyncHandler(deleteWebhook));

export default router;
