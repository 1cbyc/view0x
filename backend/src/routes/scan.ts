import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listScanChains,
  scanAddress,
  getScanResult,
} from "../controllers/addressScanController";
import { validateScanAddress } from "../middleware/validation";
import { optionalAuth } from "../middleware/auth";
import { addressScanRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.get("/chains", asyncHandler(listScanChains));
router.post(
  "/address",
  addressScanRateLimiter,
  optionalAuth,
  validateScanAddress,
  asyncHandler(scanAddress),
);
router.get(
  "/address/:id",
  optionalAuth,
  asyncHandler(getScanResult),
);

export default router;
