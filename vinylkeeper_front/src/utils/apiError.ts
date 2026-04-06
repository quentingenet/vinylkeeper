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

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  if (error instanceof Error) return { code: 9999, message: error.message, details: {} };
  return { code: 9999, message: "Unknown error occurred", details: {} };
}
