import ky, { HTTPError } from "ky";
import { ApiError, isApiError } from "./apiError";

export type { ApiError };
export type AppError = ApiError;

const getCsrfToken = (): string | null => {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Requests that get a 401 at the same time share a single refresh call
let refreshInFlight: Promise<void> | null = null;

const refreshSession = (apiTarget: string): Promise<void> => {
  refreshInFlight ??= ky
    .post(`${apiTarget}/users/refresh-token`, { credentials: "include" })
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
};

interface RequestOptions {
  apiTarget: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  retrying?: boolean;
  skipRefresh?: boolean;
}

const requestService = async <T = unknown>({
  apiTarget,
  method,
  endpoint,
  body,
  headers = {},
  retrying = false,
  skipRefresh = false,
}: RequestOptions): Promise<T> => {
  if (!apiTarget || !endpoint) {
    throw { code: 9999, message: "API target or endpoint is missing.", details: {} } satisfies AppError;
  }

  const urlToFetch = `${apiTarget}${endpoint}`;

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    json: body,
    credentials: "include" as RequestCredentials,
    hooks: {
      beforeRequest: [
        ({ request }: { request: Request }): void => {
          const csrfToken = getCsrfToken();
          if (csrfToken) {
            request.headers.set("X-CSRF-Token", csrfToken);
          }
        },
      ],
    },
  };

  try {
    const response = await ky(urlToFetch, options);

    if (response.status === 204) return null as T;

    const contentType = response.headers.get("content-type");

    if (!contentType) return null as T;

    if (contentType.includes("application/json")) {
      return await response.json<T>();
    } else if (contentType.includes("text/")) {
      return (await response.text()) as T;
    } else {
      throw { code: 9999, message: `Unexpected content-type: ${contentType}`, details: {} } satisfies AppError;
    }
  } catch (error: unknown) {
    if (
      error instanceof HTTPError &&
      error.response?.status === 401 &&
      !retrying &&
      !skipRefresh
    ) {
      try {
        await refreshSession(apiTarget);

        return await requestService<T>({
          apiTarget,
          method,
          endpoint,
          body,
          headers,
          retrying: true,
        });
      } catch {
        throw {
          code: 401,
          message: "Session expired. Please log in again.",
          details: {},
        } satisfies AppError;
      }
    }

    // ky has already parsed the error body: the API sends an ApiError
    if (error instanceof HTTPError && isApiError(error.data)) {
      throw error.data;
    }
    // Body that is not JSON (a 429 or 502 page of the proxy, say): keep the HTTP status
    if (error instanceof HTTPError) {
      throw { code: error.response.status, message: error.message, details: {} } satisfies AppError;
    }

    const message = error instanceof Error ? error.message : "Unknown error occurred";
    throw { code: 9999, message, details: {} } satisfies AppError;
  }
};

export default requestService;
