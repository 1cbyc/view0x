import * as Sentry from "@sentry/node";
import { env } from "./environment";
import { logger } from "../utils/logger";

let initialized = false;

export function initializeSentry(): void {
  if (!env.SENTRY_DSN) {
    logger.info("Sentry disabled: SENTRY_DSN is not configured");
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
  });
  initialized = true;
  logger.info("Sentry error tracking initialized");
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
