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
 */
const requestService = async <T = any>({
  apiTarget,
  method,
  endpoint,
  body,
  headers = {},
  retrying = false, // internal use
  skipRefresh = false, // skip automatic refresh
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
    credentials: "include" as RequestCredentials, // send cookies
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
    if (
      error instanceof HTTPError &&
      error.response?.status === 401 &&
      !retrying &&
      !skipRefresh
    ) {
      console.warn("401 Unauthorized — trying token refresh...");
      try {
        // attempt to refresh tokens
        await ky.post(`${apiTarget}/users/refresh-token`, {
          credentials: "include",
        });

        // retry original request
        return await requestService<T>({
          apiTarget,
          method,
          endpoint,
          body,
          headers,
          retrying: true,
        });
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw new Error("Unauthorized and token refresh failed");
      }
    }

    throw new Error(`Request error: ${error.message || error}`);
  }
};

export default requestService;
