import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { listScanChains, scanAddress } from "../controllers/addressScanController";
import { validateScanAddress } from "../middleware/validation";
import { auth } from "../middleware/auth";

const router = Router();

router.get("/chains", asyncHandler(listScanChains));
router.post("/address", validateScanAddress, asyncHandler(scanAddress));
router.post("/address/authenticated", auth, validateScanAddress, asyncHandler(scanAddress));

export default router;
