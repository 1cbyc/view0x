import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { env } from "../config/environment";
import { logger } from "../utils/logger";
import { AuthenticationError, AuthorizationError } from "./errorHandler";

interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        plan: "free" | "pro" | "enterprise";
      };
    }
  }
}

// Main authentication middleware
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    // Verify JWT token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new AuthenticationError("Authentication token has expired");
      } else if (error.name === "JsonWebTokenError") {
        throw new AuthenticationError("Invalid authentication token");
      } else {
        throw new AuthenticationError("Token verification failed");
      }
    }

    // Get user from database
    const user = await User.scope("withoutSecrets").findByPk(decoded.userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    // Attach user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    };

    logger.debug("User authenticated", {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      logger.warn("Authentication failed", {
        error: error.message,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
      });
    } else {
      logger.error("Auth middleware error:", error);
    }
    next(error);
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(); // Continue without authentication
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await User.scope("withoutSecrets").findByPk(decoded.userId);

    if (user) {
      req.user = {
        userId: user.id,
        email: user.email,
        plan: user.plan,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// API Key authentication
export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const apiKey = req.headers["x-api-key"] as string;

    if (!apiKey) {
      throw new AuthenticationError("API key required");
    }

    if (!apiKey.startsWith("sa_")) {
      throw new AuthenticationError("Invalid API key format");
    }

    const user = await User.findByApiKey(apiKey);
    if (!user) {
      throw new AuthenticationError("Invalid API key");
    }

    req.user = {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    };

    logger.debug("API key authenticated", {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    });

    next();
  } catch (error) {
    next(error);
  }
};

// Require specific plan
export const requirePlan = (requiredPlan: "pro" | "enterprise") => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
    const userPlanLevel = planHierarchy[req.user.plan];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      return next(new AuthorizationError(`${requiredPlan} plan required`));
    }

    next();
  };
};

// Check if user can perform analysis (usage limits)
export const checkAnalysisLimits = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(new AuthenticationError("Authentication required"));
    }

    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return next(new AuthenticationError("User not found"));
    }

    if (!user.canAnalyze()) {
      return next(
        new AuthorizationError(
          "Analysis limit exceeded. Please upgrade your plan.",
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Helper function to extract token from request
function extractToken(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check query parameter (for WebSocket connections)
  if (req.query.token && typeof req.query.token === "string") {
    return req.query.token;
  }

  return null;
}

// Refresh token validation
export const refreshTokenAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError("Refresh token required");
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        refreshToken,
        env.REFRESH_TOKEN_SECRET,
      ) as JwtPayload;
    } catch (error) {
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findByPk(decoded.userId);
    if (
      !user ||
      !user.isRefreshTokenValid() ||
      user.refreshToken !== refreshToken
    ) {
      throw new AuthenticationError("Invalid or expired refresh token");
    }

    req.user = {
      userId: user.id,
      email: user.email,
      plan: user.plan,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default auth;
