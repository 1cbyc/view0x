import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  resendVerification,
  generateApiKey,
  revokeApiKey,
} from "../controllers/auth";
import { auth, refreshTokenAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { authRateLimiter } from "../middleware/rateLimit";
import { validateRegister, validateLogin } from "../middleware/validation";

const router = Router();

// =================================
// Public Authentication Routes
// =================================

// Register a new user
router.post(
  "/register",
  authRateLimiter,
  validateRegister,
  asyncHandler(register),
);

// Login a user
router.post("/login", authRateLimiter, validateLogin, asyncHandler(login));

// Refresh access token
router.post("/refresh", authRateLimiter, asyncHandler(refreshToken));

// Request a password reset
router.post(
  "/forgot-password",
  authRateLimiter,
  asyncHandler(requestPasswordReset),
);

// Reset a password with a token
router.post("/reset-password", authRateLimiter, asyncHandler(resetPassword));

// Verify email
router.post("/verify-email", authRateLimiter, asyncHandler(verifyEmail));

// Resend verification email
router.post("/resend-verification", authRateLimiter, asyncHandler(resendVerification));

// =================================
// Protected Authentication Routes
// =================================

// Logout a user (requires valid access token to identify session)
router.post("/logout", auth, asyncHandler(logout));

// Get the current authenticated user's profile
router.get("/me", auth, asyncHandler(getCurrentUser));

// API key management
router.post("/api-key", auth, asyncHandler(generateApiKey));
router.delete("/api-key", auth, asyncHandler(revokeApiKey));

// Health check for auth service
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "authentication",
    status: "operational",
    timestamp: new Date().toISOString(),
  });
});

export default router;
