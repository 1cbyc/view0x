import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import {
  setup2FA,
  verify2FA,
  enable2FA,
  disable2FA,
} from "../controllers/twoFactorController";

const router = Router();

router.post("/generate", auth, asyncHandler(setup2FA));
router.post("/verify", auth, asyncHandler(verify2FA));
router.post("/enable", auth, asyncHandler(enable2FA));
router.post("/disable", auth, asyncHandler(disable2FA));

export default router;
