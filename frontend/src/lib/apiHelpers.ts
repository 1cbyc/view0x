/** Normalize axios / API error shapes from our interceptor. */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!err || typeof err !== "object") {
    return err instanceof Error ? err.message : fallback;
  }
  const apiErr = err as {
    status?: number;
    error?: { message?: string };
    message?: string;
    response?: { data?: { error?: { message?: string } } };
  };
  return (
    apiErr.error?.message ||
    apiErr.response?.data?.error?.message ||
    apiErr.message ||
    fallback
  );
}

export function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: number; response?: { status?: number } }).status;
  const responseStatus = (err as { response?: { status?: number } }).response?.status;
  return status === 401 || status === 403 || responseStatus === 401 || responseStatus === 403;
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}
