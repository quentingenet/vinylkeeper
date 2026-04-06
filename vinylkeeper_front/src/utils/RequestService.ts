import ky, { HTTPError } from "ky";
import { ApiError } from "./apiError";

export type { ApiError };
export type AppError = ApiError;

interface EnrichedHTTPError extends HTTPError {
  errorData?: ApiError;
}

interface RequestOptions {
  apiTarget: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: unknown;
  headers?: HeadersInit;
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
      beforeError: [
        async (error: HTTPError): Promise<HTTPError> => {
          const { response } = error;
          if (response && response.body) {
            try {
              const errorData = (await response.json()) as AppError;
              const enriched = new HTTPError(
                response,
                error.request,
                error.options
              ) as EnrichedHTTPError;
              enriched.errorData = errorData;
              return enriched;
            } catch {
              return error;
            }
          }
          return error;
        },
      ],
    },
  };

  try {
    const response = await ky(urlToFetch, options);
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
        await ky.post(`${apiTarget}/users/refresh-token`, {
          credentials: "include",
        });

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

    const enriched = error as EnrichedHTTPError;
    if (enriched instanceof HTTPError && enriched.errorData) {
      throw enriched.errorData;
    }

    const message = error instanceof Error ? error.message : "Unknown error occurred";
    throw { code: 9999, message, details: {} } satisfies AppError;
  }
};

export default requestService;
