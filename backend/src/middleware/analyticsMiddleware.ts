import { Request, Response, NextFunction } from "express";
import ApiAnalytics from "../models/ApiAnalytics";
import { logger } from "../utils/logger";

/**
 * Middleware to track API analytics
 * Captures request/response metadata for monitoring and analysis
 */
export const analyticsMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const startTime = Date.now();

    // Capture original send function
    const originalSend = res.send;

    // Store response body
    let responseBody: any;

    // Override send to capture response
    res.send = function (body?: any): Response {
        responseBody = body;
        return originalSend.call(this, body);
    };

    // Listen for response finish
    res.on("finish", async () => {
        const responseTime = Date.now() - startTime;

        try {
            // Don't track analytics for certain endpoints (avoid infinite loops)
            if (
                req.path.startsWith("/api/analytics") ||
                req.path === "/health" ||
                req.path.includes("api-docs")
            ) {
                return;
            }

            // Sanitize sensitive data
            const sanitizedRequest = sanitizeData(req.body);
            const sanitizedResponse = sanitizeData(
                typeof responseBody === "string"
                    ? tryParseJSON(responseBody)
                    : responseBody
            );

            // Get user ID if authenticated
            const userId = (req as any).user?.userId;

            // Get client IP
            const ipAddress =
                (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
                req.socket.remoteAddress ||
                "unknown";

            // Create analytics record
            await ApiAnalytics.create({
                endpoint: req.path,
                method: req.method,
                statusCode: res.statusCode,
                responseTime,
                userId,
                ipAddress,
                userAgent: req.headers["user-agent"],
                requestBody: sanitizedRequest,
                responseBody: sanitizedResponse,
                errorMessage: res.statusCode >= 400 ? sanitizedResponse?.error?.message : null,
                timestamp: new Date(),
            });
        } catch (error) {
            // Silently fail - don't let analytics tracking break the app
            logger.error("Analytics tracking error:", error);
        }
    });

    next();
};

/**
 * Sanitize sensitive data from request/response
 */
function sanitizeData(data: any): any {
    if (!data) return null;

    const sensitiveFields = [
        "password",
        "token",
        "apiKey",
        "secret",
        "authorization",
        "creditCard",
        "ssn",
    ];

    if (typeof data === "object" && !Array.isArray(data)) {
        const sanitized = { ...data };
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = "[REDACTED]";
            }
        }
        return sanitized;
    }

    return data;
}

/**
 * Try to parse JSON string
 */
function tryParseJSON(str: string): any {
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}
