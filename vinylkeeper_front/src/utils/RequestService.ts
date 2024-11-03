import ky from "ky";

interface RequestOptions {
  apiTarget: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: any;
  headers?: HeadersInit;
}

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
