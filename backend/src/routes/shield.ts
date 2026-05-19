import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getShieldApprovalsHandler,
  getShieldHoldingsHandler,
  getShieldNftApprovalsHandler,
  getShieldSnapshotHandler,
  listShieldChainsHandler,
} from "../controllers/shieldController";
import { shieldRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.use(shieldRateLimiter);

router.get("/chains", asyncHandler(listShieldChainsHandler));
router.get("/snapshot", asyncHandler(getShieldSnapshotHandler));
router.get("/approvals", asyncHandler(getShieldApprovalsHandler));
router.get("/nft-approvals", asyncHandler(getShieldNftApprovalsHandler));
router.get("/holdings", asyncHandler(getShieldHoldingsHandler));

export default router;
