import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getShieldApprovalsHandler,
  getShieldHistoryHandler,
  getShieldHoldingsHandler,
  getShieldNftApprovalsHandler,
  getShieldPermit2ApprovalsHandler,
  getShieldScanHandler,
  getShieldSnapshotHandler,
  listShieldChainsHandler,
} from "../controllers/shieldController";
import { shieldRateLimiter } from "../middleware/rateLimit";

const router = Router();

router.use(shieldRateLimiter);

router.get("/chains", asyncHandler(listShieldChainsHandler));
router.get("/scan", asyncHandler(getShieldScanHandler));
router.get("/snapshot", asyncHandler(getShieldSnapshotHandler));
router.get("/approvals", asyncHandler(getShieldApprovalsHandler));
router.get("/nft-approvals", asyncHandler(getShieldNftApprovalsHandler));
router.get("/holdings", asyncHandler(getShieldHoldingsHandler));
router.get("/permit2-approvals", asyncHandler(getShieldPermit2ApprovalsHandler));
router.get("/history", asyncHandler(getShieldHistoryHandler));

export default router;
