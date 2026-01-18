import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/environment";
import { logger } from "../utils/logger";

/**
 * Request Signing Middleware
 * Implements HMAC-based request signing for API authentication
 * Used for API key-based requests to prevent tampering
 */
export interface SignedRequest extends Request {
  signature?: string;
  timestamp?: number;
}

const SIGNATURE_HEADER = "X-Signature";
const TIMESTAMP_HEADER = "X-Timestamp";
const SIGNATURE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate signature for a request
 */
export const generateSignature = (
  method: string,
  path: string,
  body: any,
  timestamp: number,
  secret: string,
): string => {
  const bodyString = body ? JSON.stringify(body) : "";
  const message = `${method}${path}${bodyString}${timestamp}`;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
};

/**
 * Verify request signature
 */
export const verifySignature = (
  method: string,
  path: string,
  body: any,
  signature: string,
  timestamp: number,
  secret: string,
): boolean => {
  // Check timestamp freshness
  const now = Date.now();
  if (Math.abs(now - timestamp) > SIGNATURE_TTL) {
    logger.warn(`Request signature expired. Timestamp: ${timestamp}, Now: ${now}`);
    return false;
  }

  const expectedSignature = generateSignature(method, path, body, timestamp, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
};

/**
 * Request signing middleware
 * Only applies to API key authenticated requests
 */
export const requestSigningMiddleware = (
  req: SignedRequest,
  res: Response,
  next: NextFunction,
) => {
  // Skip for non-API key requests
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer sa_")) {
    return next();
  }

  // Skip for GET requests (read-only)
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  // Extract signature and timestamp
  const signature = req.headers[SIGNATURE_HEADER.toLowerCase()] as string;
  const timestampStr = req.headers[TIMESTAMP_HEADER.toLowerCase()] as string;

  if (!signature || !timestampStr) {
    return res.status(401).json({
      success: false,
      error: {
        code: "SIGNATURE_REQUIRED",
        message: "Request signature and timestamp are required for API key requests",
      },
    });
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_TIMESTAMP",
        message: "Invalid timestamp format",
      },
    });
  }

  // Get API key secret (in production, fetch from database)
  // For now, use JWT_SECRET as the signing secret
  const apiSecret = env.JWT_SECRET;

  // Verify signature
  const path = req.path;
  const body = req.body;
  const isValid = verifySignature(
    req.method,
    path,
    body,
    signature,
    timestamp,
    apiSecret,
  );

  if (!isValid) {
    logger.warn(`Invalid request signature for ${req.method} ${req.path} from ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_SIGNATURE",
        message: "Request signature verification failed",
      },
    });
  }

  next();
};
