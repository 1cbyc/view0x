import { Request, Response, NextFunction } from "express";
import { env } from "../config/environment";
import { logger } from "../utils/logger";

/**
 * CSRF Protection Middleware
 * For API endpoints, we use token-based CSRF protection
 * For state-changing operations, we require a CSRF token
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Skip CSRF for public endpoints (no auth required)
  const publicPaths = ["/api/analysis/public", "/api/auth/login", "/api/auth/register", "/health"];
  if (publicPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // For authenticated requests, check CSRF token
  // In production, you should use a proper CSRF library like csurf
  // For now, we'll use a simple token-based approach
  const csrfToken = req.headers["x-csrf-token"] || req.body._csrf;
  const sessionToken = req.headers["x-session-token"];

  // If using API key authentication, skip CSRF (API keys are already secure)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer sa_")) {
    return next(); // API key authentication, skip CSRF
  }

  // For session-based auth, require CSRF token
  if (req.user && !csrfToken) {
    logger.warn(`CSRF token missing for ${req.method} ${req.path} from ${req.ip}`);
    return res.status(403).json({
      success: false,
      error: {
        code: "CSRF_TOKEN_MISSING",
        message: "CSRF token is required for this request",
      },
    });
  }

  // In development, we can be more lenient
  if (env.NODE_ENV === "development" && !csrfToken) {
    logger.warn(`CSRF token missing in development for ${req.method} ${req.path}`);
    // Allow in development but log warning
    return next();
  }

  next();
};

/**
 * Generate CSRF token (should be called on login/session creation)
 */
export const generateCsrfToken = (): string => {
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
};
