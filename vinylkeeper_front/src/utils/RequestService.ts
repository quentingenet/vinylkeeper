import ky from "ky";

/**
 * Request options interface
 * @interface RequestOptions
 * @property {string} apiTarget - The target API URL
 * @property {"GET" | "POST" | "PUT" | "PATCH" | "DELETE"} method - The HTTP method to use
 * @property {string} endpoint - The endpoint to request
 * @property {any} body - The request body
 * @property {HeadersInit} headers - The request headers
 */
interface RequestOptions {
  apiTarget: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: any;
  headers?: HeadersInit;
}

/**
 * Request service function
 * @function requestService
 * @param {RequestOptions} options - The request options
 * @returns {Promise<T>} The response data
 */
const requestService = async <T = any>({
  apiTarget,
  method,
  endpoint,
  body,
  headers = {},
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
  };

  try {
    const response = await ky(urlToFetch, options);

    const contentType = response.headers.get("content-type");
    if (!contentType) {
      return null as T;
    }
    if (contentType?.includes("application/json")) {
      return await response.json<T>();
    } else if (contentType?.includes("text/")) {
      return (await response.text()) as T;
    } else {
      throw new Error(`Unexpected content-type: ${contentType}`);
    }
  } catch (error: any) {
    throw new Error(`Request error: ${error.message || error}`);
  }
};

export default requestService;
