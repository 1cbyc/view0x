import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listScanChains,
  listScanHistory,
  scanAddress,
  getScanResult,
  createShareForScan,
  getSharedScanResult,
} from "../controllers/addressScanController";
import { validateScanAddress } from "../middleware/validation";
import { optionalAuth } from "../middleware/auth";
import { auth } from "../middleware/auth";
import { addressScanRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.get("/chains", asyncHandler(listScanChains));
router.get("/history", auth, asyncHandler(listScanHistory));
router.post(
  "/address",
  addressScanRateLimiter,
  optionalAuth,
  validateScanAddress,
  asyncHandler(scanAddress),
);
router.get("/shared/:token", asyncHandler(getSharedScanResult));
router.get(
  "/address/:id",
  optionalAuth,
  asyncHandler(getScanResult),
);
router.post("/address/:id/share", auth, asyncHandler(createShareForScan));

export default router;
