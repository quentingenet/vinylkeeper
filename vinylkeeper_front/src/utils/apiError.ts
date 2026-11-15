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


/** The codes of the API the app acts on (app/core/exceptions.py ErrorCode): keep both in step. */
export enum ApiErrorCode {
  INVALID_CREDENTIALS = 1000,
  ACCOUNT_LOCKED = 1003,
  INVALID_TOKEN = 1004,
  TERMS_NOT_ACCEPTED = 1008,
  RESOURCE_NOT_FOUND = 2000,
  RESOURCE_ALREADY_EXISTS = 2001,
  FORBIDDEN_OWNER = 4003,
  CSRF_TOKEN_INVALID = 4004,
}

/**
 * Whether the server really refused the session: an HTTP 401/403, an authentication code of the API
 * (1000-1999) or a CSRF refusal. A network failure (9999), a 5xx or a rate limit is not one: the
 * session may still be valid once the server answers again.
 */
export function isSessionRefused(error: unknown): boolean {
  if (!isApiError(error)) return false;
  const { code } = error;
  return code === 401 || code === 403 || code === ApiErrorCode.CSRF_TOKEN_INVALID || (code >= 1000 && code < 2000);
}
