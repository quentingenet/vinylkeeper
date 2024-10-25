interface RequestOptions {
  apiTarget: string;
  method: string;
  endpoint: string;
  body?: any;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
}

const requestService = async ({
  apiTarget,
  method,
  endpoint,
  body,
  headers = {},
  credentials = "include",
}: RequestOptions) => {
  try {
    if (!apiTarget || !endpoint) {
      throw new Error("API target or endpoint is missing.");
    }
    const urlToFetch = apiTarget.concat(endpoint);
    const response = await fetch(urlToFetch, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    throw new Error(`Request error: ${error}`);
  }
};

export default requestService;
