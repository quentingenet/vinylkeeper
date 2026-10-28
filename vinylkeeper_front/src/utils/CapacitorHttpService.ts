import { CapacitorHttp, CapacitorCookies } from "@capacitor/core";
import { API_VK_URL } from "./GlobalUtils";
import { ApiError } from "./apiError";

interface CapacitorHttpOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipRefresh?: boolean;
}

class CapacitorHttpService {
  private readonly baseUrl: string = API_VK_URL;
  // Requests that get a 401 at the same time share a single refresh call
  private refreshInFlight: Promise<void> | null = null;

  async request<T = unknown>({
    method,
    endpoint,
    body,
    headers = {},
    skipRefresh = false,
  }: CapacitorHttpOptions): Promise<T> {
    if (!endpoint) {
      throw new Error("Endpoint is missing.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    const cookies = await CapacitorCookies.getCookies({ url: this.baseUrl });
    if (cookies.csrf_token) {
      defaultHeaders["X-CSRF-Token"] = cookies.csrf_token;
    }

    let response: Awaited<ReturnType<typeof CapacitorHttp.request>>;
    try {
      response = await CapacitorHttp.request({
        method,
        url,
        headers: defaultHeaders,
        data: body,
        connectTimeout: 60000,
        readTimeout: 60000,
      });
    } catch (error: unknown) {
      // Network failure: no HTTP response at all
      throw this.handleError(error as { message?: string });
    }

    if (response.status >= 200 && response.status < 300) {
      const contentType = response.headers["content-type"] || "";

      if (contentType.includes("application/json")) {
        return (typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data) as unknown as T;
      }
      return response.data as T;
    }

    // CapacitorHttp resolves whatever the HTTP status: the 401 is read on the response
    if (response.status === 401 && !skipRefresh) {
      try {
        await this.refreshToken();
      } catch {
        throw new Error("Unauthorized and token refresh failed");
      }
      return this.request<T>({
        method,
        endpoint,
        body,
        headers,
        skipRefresh: true,
      });
    }

    throw this.handleError(response);
  }

  private refreshToken(): Promise<void> {
    this.refreshInFlight ??= CapacitorHttp.request({
      method: "POST",
      url: `${this.baseUrl}/users/refresh-token`,
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`Token refresh failed (${response.status})`);
        }
      })
      .finally(() => {
        this.refreshInFlight = null;
      });
    return this.refreshInFlight;
  }

  private handleError(error: {
    status?: number;
    data?: unknown;
    message?: string;
  }): ApiError {
    if (error.data) {
      try {
        const errorData: unknown =
          typeof error.data === "string" ? JSON.parse(error.data) : error.data;

        if (
          errorData &&
          typeof errorData === "object" &&
          ("message" in errorData || "code" in errorData)
        ) {
          return errorData as ApiError;
        }
      } catch {
        // If parsing fails, continue with default error handling
      }
    }

    return {
      code: error.status || 9999,
      message: error.message || "Unknown error occurred",
      details: {},
    };
  }

  async get<T>(endpoint: string, skipRefresh: boolean = false): Promise<T> {
    return this.request<T>({
      method: "GET",
      endpoint,
      skipRefresh,
    });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    skipRefresh: boolean = false
  ): Promise<T> {
    return this.request<T>({
      method: "POST",
      endpoint,
      body,
      skipRefresh,
    });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    skipRefresh: boolean = false
  ): Promise<T> {
    return this.request<T>({
      method: "PUT",
      endpoint,
      body,
      skipRefresh,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    skipRefresh: boolean = false
  ): Promise<T> {
    return this.request<T>({
      method: "PATCH",
      endpoint,
      body,
      skipRefresh,
    });
  }

  async delete<T>(endpoint: string, skipRefresh: boolean = false): Promise<T> {
    return this.request<T>({
      method: "DELETE",
      endpoint,
      skipRefresh,
    });
  }
}

export const capacitorHttpService = new CapacitorHttpService();
