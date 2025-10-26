import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

// Helper function to get the IP address from the request
const getIpAddress = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Create different rate limiters for different endpoints
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use API key if present, otherwise use IP
      const apiKey = req.headers.authorization?.replace('Bearer ', '');
      if (apiKey && apiKey.startsWith('sa_')) {
        return `api_${apiKey}`;
      }
      return getIpAddress(req);
    }),
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    },
  });
};

// Default rate limiter
export const rateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: `Too many requests from this IP, please try again later.`,
  skipSuccessfulRequests: true,
});

// Strict rate limiter for authentication endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: false,
});

// Analysis rate limiter (stricter for free users)
export const analysisRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Base limit, will be adjusted based on user plan
  message: 'Analysis rate limit exceeded. Please upgrade your plan for higher limits.',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId;
    if (userId) {
      return `user_${userId}`;
    }
    return getIpAddress(req);
  },
});

// Plan-based rate limiting middleware
export const planBasedRateLimit = (req: Request, res: Response, next: any) => {
  const user = (req as any).user;

  if (!user) {
    return next();
  }

  // Define limits based on plan
  const planLimits = {
    free: { requests: 100, analyses: 10 },
    pro: { requests: 1000, analyses: -1 }, // unlimited
    enterprise: { requests: 10000, analyses: -1 }
  };

  const userLimit = planLimits[user.plan as keyof typeof planLimits] || planLimits.free;

  // Create dynamic rate limiter based on user plan
  const dynamicLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: userLimit.requests,
    message: `Rate limit exceeded for ${user.plan} plan. Please upgrade for higher limits.`,
    keyGenerator: () => `user_${user.userId}`,
  });

  return dynamicLimiter(req, res, next);
};

// Export all rate limiters
export default rateLimiter;
