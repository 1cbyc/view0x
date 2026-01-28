import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import {
    getAnalyticsDashboard,
    getEndpointAnalytics,
    exportAnalytics,
} from "../controllers/analyticsController";

const router = Router();

// All analytics endpoints require authentication
// In a real application, you might want admin-only access

// Get analytics dashboard
router.get("/dashboard", auth, asyncHandler(getAnalyticsDashboard));

// Get endpoint-specific analytics
router.get("/endpoint", auth, asyncHandler(getEndpointAnalytics));

// Export analytics
router.get("/export", auth, asyncHandler(exportAnalytics));

export default router;
