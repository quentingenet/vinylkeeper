import { CapacitorHttp } from "@capacitor/core";
import { API_VK_URL } from "./GlobalUtils";

interface CapacitorHttpOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipRefresh?: boolean;
}

interface ErrorResponse {
  code: number;
  message: string;
  details: Record<string, unknown>;
}

class CapacitorHttpService {
  private readonly baseUrl: string = API_VK_URL;

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

    try {
      const response = await CapacitorHttp.request({
        method,
        url,
        headers: defaultHeaders,
        data: body,
        connectTimeout: 60000,
        readTimeout: 60000,
      });

      if (response.status >= 200 && response.status < 300) {
        const contentType = response.headers["content-type"] || "";

        if (contentType.includes("application/json")) {
          return typeof response.data === "string"
            ? JSON.parse(response.data)
            : response.data;
        } else if (contentType.includes("text/")) {
          return response.data as T;
        }

        return response.data as T;
      }

      throw this.handleError(response);
    } catch (error: unknown) {
      const httpError = error as {
        status?: number;
        data?: unknown;
        message?: string;
      };
      if (httpError.status === 401 && !skipRefresh) {
        try {
          await this.refreshToken();
          return this.request<T>({
            method,
            endpoint,
            body,
            headers,
            skipRefresh: true,
          });
        } catch {
          throw new Error("Unauthorized and token refresh failed");
        }
      }

      throw this.handleError(httpError);
    }
  }

  private async refreshToken(): Promise<void> {
    await CapacitorHttp.request({
      method: "POST",
      url: `${this.baseUrl}/users/refresh-token`,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private handleError(error: {
    status?: number;
    data?: unknown;
    message?: string;
  }): ErrorResponse {
    if (error.data) {
      try {
        const errorData =
          typeof error.data === "string" ? JSON.parse(error.data) : error.data;

        if (
          errorData &&
          typeof errorData === "object" &&
          ("message" in errorData || "code" in errorData)
        ) {
          return errorData as ErrorResponse;
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
