import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { walletRiskResources } from "../controllers/walletResourcesController";

const router = Router();

router.get("/risk-resources", asyncHandler(walletRiskResources));

export default router;
