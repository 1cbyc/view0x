import { Router, Request, Response } from "express";
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
} from "../controllers/analysisController";
// import { validateCreateAnalysis } from "../middleware/validation";

const router = Router();

// Public analysis endpoint (no authentication required, rate limited)
router.post(
  "/public",
  analysisRateLimiter,
  // validateCreateAnalysis,
  asyncHandler(async (req: Request, res: Response) => {
    const { contractCode, contractName, options } = req.body;

    // Create anonymous analysis
    const analysisData = {
      contractCode,
      contractName: contractName || "Anonymous Contract",
      options: options || {},
      userId: null, // Anonymous
    };

          return res.json({
        success: true,
        message: "Analysis request received",
        data: {
          message: "Anonymous analysis functionality coming soon",
          suggestion: "Create an account for full analysis features",
        },
      });
  }),
);

// Create new analysis (authenticated)
router.post(
  "/",
  auth,
  analysisRateLimiter,
  // validateCreateAnalysis,
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
    features: {
      publicAnalysis: "coming_soon",
      authenticatedAnalysis: "ready",
      realTimeUpdates: "ready",
      reportGeneration: "ready",
    },
  });
});

export default router;
