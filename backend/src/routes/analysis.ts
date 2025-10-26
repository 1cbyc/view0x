import { Router, Request, Response } from "express";
import { publicAnalysis } from "../controllers/analysisController";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// Public analysis endpoint (no authentication required)
router.post("/public", asyncHandler(publicAnalysis));

// Health check for analysis service
router.get("/health", (req: Request, res: Response) => {
  res.json({
    success: true,
    service: "analysis",
    status: "operational",
    timestamp: new Date().toISOString(),
    features: {
      publicAnalysis: "ready",
      authenticatedAnalysis: "coming_soon",
      realTimeUpdates: "coming_soon",
      reportGeneration: "coming_soon",
    },
  });
});

export default router;
