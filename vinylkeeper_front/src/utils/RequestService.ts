import ky, { HTTPError } from "ky";

/**
 * Request options interface
 */
interface RequestOptions {
  apiTarget: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: any;
  headers?: HeadersInit;
  retrying?: boolean; // internal flag to avoid infinite loop
  skipRefresh?: boolean; // flag to skip automatic refresh
}

/**
 * Generic request service with automatic retry on 401 Unauthorized
 * and proper error handling for backend error responses
 */
const requestService = async <T = any>({
  apiTarget,
  method,
  endpoint,
  body,
  headers = {},
  retrying = false,
  skipRefresh = false,
}: RequestOptions): Promise<T> => {
  if (!apiTarget || !endpoint) {
    throw new Error("API target or endpoint is missing.");
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
        async (error: HTTPError) => {
          const { response } = error;
          if (response && response.body) {
            try {
              const errorData = await response.json();
              // Create a new HTTPError with the parsed error data
              const newError = new HTTPError(
                response,
                error.request,
                error.options
              );
              // Attach the error data as a property for later extraction
              (newError as any).errorData = errorData;
              return newError;
            } catch {
              // If we can't parse JSON, return the original error
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
      throw new Error(`Unexpected content-type: ${contentType}`);
    }
  } catch (error: any) {
    // Handle 401 Unauthorized with token refresh
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

        // Retry original request
        return await requestService<T>({
          apiTarget,
          method,
          endpoint,
          body,
          headers,
          retrying: true,
        });
      } catch (refreshError) {
        throw new Error("Unauthorized and token refresh failed");
      }
    }

    // Extract backend error data from HTTPError
    if (error instanceof HTTPError && (error as any).errorData) {
      throw (error as any).errorData;
    }

    // For other errors, wrap in standard error format
    throw {
      code: 9999,
      message: error.message || "Unknown error occurred",
      details: {},
    };
  }
};

export default requestService;
