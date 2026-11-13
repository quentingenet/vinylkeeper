export interface ApiError {
  code: number;
  message: string;
  details: Record<string, unknown>;
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as ApiError).code === "number" &&
    typeof (error as ApiError).message === "string"
  );
}


// ErrorCode.CSRF_TOKEN_INVALID of the API
const CSRF_TOKEN_INVALID = 4004;

/**
 * Whether the server really refused the session: an HTTP 401/403, an authentication code of the API
 * (1000-1999) or a CSRF refusal. A network failure (9999), a 5xx or a rate limit is not one: the
 * session may still be valid once the server answers again.
 */
export function isSessionRefused(error: unknown): boolean {
  if (!isApiError(error)) return false;
  const { code } = error;
  return code === 401 || code === 403 || code === CSRF_TOKEN_INVALID || (code >= 1000 && code < 2000);
}
