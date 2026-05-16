import { timingSafeEqual, createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/environment";
import { logger } from "../utils/logger";

function parseBasicAuth(
  header: string | undefined,
): { user: string; pass: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return null;
  }
  const colon = decoded.indexOf(":");
  if (colon === -1) return null;
  return {
    user: decoded.slice(0, colon),
    pass: decoded.slice(colon + 1),
  };
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

function timingSafePasswordEqual(expected: string, actual: string): boolean {
  const he = createHash("sha256").update(expected, "utf8").digest();
  const ha = createHash("sha256").update(actual, "utf8").digest();
  return timingSafeEqual(he, ha);
}

function hasConfiguredCredentials(): boolean {
  const u = env.SWAGGER_DOCS_USER?.trim();
  const p = env.SWAGGER_DOCS_PASSWORD;
  return Boolean(u && p && p.length > 0);
}

/**
 * Production: never expose Swagger without credentials.
 * With credentials: HTTP Basic Auth (browser login prompt).
 * Development/test: open when credentials unset (local DX).
 */
export function swaggerDocsAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const configured = hasConfiguredCredentials();

  if (env.NODE_ENV === "production" && !configured) {
    res.status(404).setHeader("Cache-Control", "no-store").end();
    return;
  }

  if (!configured) {
    next();
    return;
  }

  const expectedUser = env.SWAGGER_DOCS_USER!.trim();
  const expectedPass = env.SWAGGER_DOCS_PASSWORD!;

  const parsed = parseBasicAuth(req.headers.authorization);
  if (
    parsed &&
    timingSafeStringEqual(parsed.user, expectedUser) &&
    timingSafePasswordEqual(expectedPass, parsed.pass)
  ) {
    next();
    return;
  }

  logger.warn(`Swagger docs auth failed for ${req.method} ${req.path} from ${req.ip}`);
  res.setHeader("WWW-Authenticate", 'Basic realm="view0x API docs"');
  res.setHeader("Cache-Control", "no-store");
  res.status(401).send("Authentication required");
}
