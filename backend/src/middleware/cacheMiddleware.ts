import { Request, Response, NextFunction } from "express";
import { cacheService } from "../utils/cache";
import { logger } from "../utils/logger";

/**
 * Cache middleware for GET requests
 * Caches responses based on request path and query parameters
 */
export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip caching for authenticated user-specific endpoints
    const skipCachePaths = ["/api/auth/me", "/api/analysis", "/api/activity-logs"];
    if (skipCachePaths.some(path => req.path.startsWith(path)) && req.user) {
      return next();
    }

    try {
      // Generate cache key from path and query params
      const cacheKey = `${req.path}:${JSON.stringify(req.query)}`;
      const cached = await cacheService.get(cacheKey);

      if (cached) {
        logger.debug(`Cache hit for ${req.path}`);
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json to cache the response
      res.json = function (body: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, { ttl }).catch((err) => {
            logger.error(`Failed to cache response for ${req.path}:`, err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error for ${req.path}:`, error);
      next(); // Continue on cache error
    }
  };
};
