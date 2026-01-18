import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { analysisRateLimiter } from "../middleware/rateLimit";
import { auth } from "../middleware/auth";
import {
  createAnalysis,
  getAnalysis,
  getAnalysisStatus,
  getUserAnalyses,
  deleteAnalysis,
  generateReport,
  publicAnalysis,
  generateShareToken,
  getPublicAnalysis,
  revokeShareToken,
} from "../controllers/analysisController";
import { validateCreateAnalysis } from "../middleware/validation";

const router = Router();

// Public analysis endpoint (no auth required)
router.post("/public", asyncHandler(publicAnalysis));

// Create new analysis (authenticated) - follows system design: creates job and queues it
router.post(
  "/",
  auth,
  analysisRateLimiter,
  validateCreateAnalysis,
  asyncHandler(createAnalysis),
);

// Get specific analysis result
router.get("/:id", auth, asyncHandler(getAnalysis));

// Get analysis status (for polling)
router.get("/:id/status", auth, asyncHandler(getAnalysisStatus));

// Get user's analysis history
router.get("/", auth, asyncHandler(getUserAnalyses));

// Delete analysis
router.delete("/:id", auth, asyncHandler(deleteAnalysis));

// Generate report
router.post("/:id/report", auth, asyncHandler(generateReport));

// Health check for analysis service
router.get("/health/check", (req, res) => {
  res.json({
    success: true,
    service: "analysis",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

export default router;
