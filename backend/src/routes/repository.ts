import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { auth } from "../middleware/auth";
import { analysisRateLimiter } from "../middleware/rateLimit";
import {
    analyzeGitHubRepo,
    analyzeGitLabRepo,
    analyzeRepository,
} from "../controllers/repositoryController";

const router = Router();

// Analyze repository (auto-detect platform)
router.post(
    "/analyze",
    auth,
    analysisRateLimiter,
    asyncHandler(analyzeRepository),
);

// Analyze GitHub repository
router.post(
    "/github",
    auth,
    analysisRateLimiter,
    asyncHandler(analyzeGitHubRepo),
);

// Analyze GitLab repository
router.post(
    "/gitlab",
    auth,
    analysisRateLimiter,
    asyncHandler(analyzeGitLabRepo),
);

export default router;
