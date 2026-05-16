import type { Request } from "express";
import { randomUUID } from "crypto";

const HEADER = "x-guest-session";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeGuestSessionId(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return UUID_RE.test(trimmed) ? trimmed : undefined;
}

/** Read guest session id from `X-Guest-Session` header or request body. */
export function getGuestSessionIdFromRequest(req: Request): string | undefined {
  const fromHeader = normalizeGuestSessionId(req.headers[HEADER]);
  if (fromHeader) return fromHeader;
  const body = req.body as { guestSessionId?: unknown } | undefined;
  return normalizeGuestSessionId(body?.guestSessionId);
}

export function newGuestSessionId(): string {
  return randomUUID();
}
