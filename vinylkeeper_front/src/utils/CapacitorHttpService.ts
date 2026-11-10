import { CapacitorHttp } from "@capacitor/core";
import { API_VK_URL } from "./GlobalUtils";
import { ApiError } from "./apiError";
import { extractFilenameFromContentDisposition } from "./DownloadUtils";
import { nativeSession } from "./NativeSession";

interface CapacitorHttpOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipRefresh?: boolean;
  // Left out for JSON: CapacitorHttp then reads the content type, an empty 204 included
  responseType?: "blob";
}

type NativeResponse = Awaited<ReturnType<typeof CapacitorHttp.request>>;

const TIMEOUT_MS = 60000;

const sessionExpired = (): ApiError => ({
  code: 401,
  message: "Session expired. Please log in again.",
  details: {},
});

/** Header names come back in the case the server used. */
const headerOf = (response: NativeResponse, name: string): string => {
  const key = Object.keys(response.headers ?? {}).find((k) => k.toLowerCase() === name);
  return key ? response.headers[key] : "";
};

/**
 * HTTP client of the Android app. The API sees "Authorization: Bearer": no cookie, so no CSRF
 * token either. The tokens come from the Keystore (NativeSession); a 401 renews them once.
 */
class CapacitorHttpService {
  private readonly baseUrl: string = API_VK_URL;
  // Requests that get a 401 at the same time share a single refresh call
  private refreshInFlight: Promise<void> | null = null;

  private async execute({
    method,
    endpoint,
    body,
    headers = {},
    skipRefresh = false,
    responseType,
  }: CapacitorHttpOptions): Promise<NativeResponse> {
    if (!endpoint) {
      throw new Error("Endpoint is missing.");
    }

    const accessToken = await nativeSession.getAccessToken();
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };

    let response: NativeResponse;
    try {
      response = await CapacitorHttp.request({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: requestHeaders,
        data: body,
        ...(responseType ? { responseType } : {}),
        connectTimeout: TIMEOUT_MS,
        readTimeout: TIMEOUT_MS,
      });
    } catch (error: unknown) {
      // Network failure: no HTTP response at all
      throw this.handleError(error as { message?: string });
    }

    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    // CapacitorHttp resolves whatever the HTTP status: the 401 is read on the response
    if (response.status === 401 && !skipRefresh) {
      await this.refreshSession();
      return this.execute({ method, endpoint, body, headers, skipRefresh: true, responseType });
    }

    throw this.handleError(response);
  }

  private async request<T>(options: CapacitorHttpOptions): Promise<T> {
    const response = await this.execute(options);
    if (headerOf(response, "content-type").includes("application/json")) {
      return (typeof response.data === "string"
        ? JSON.parse(response.data)
        : response.data) as unknown as T;
    }
    return response.data as T;
  }

  /**
   * New tokens from the refresh token, sent as a Bearer. A refusal (401/403) ends the session: the
   * tokens are erased. A network failure does not: the user is still logged in, just offline.
   */
  refreshSession(): Promise<void> {
    this.refreshInFlight ??= this.renewTokens().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  /**
   * Logout: the server ends the session of this device, which it finds by the refresh token (sent as a
   * Bearer, as for a refresh). Best effort: offline, the device forgets its tokens all the same.
   */
  async revokeSession(): Promise<void> {
    const refreshToken = await nativeSession.getRefreshToken();
    if (!refreshToken) return;
    try {
      await CapacitorHttp.request({
        method: "POST",
        url: `${this.baseUrl}/users/logout`,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${refreshToken}` },
        connectTimeout: TIMEOUT_MS,
        readTimeout: TIMEOUT_MS,
      });
    } catch {
      // No network: nothing more to do here
    }
  }

  private async renewTokens(): Promise<void> {
    const refreshToken = await nativeSession.getRefreshToken();
    if (!refreshToken) {
      throw sessionExpired();
    }

    let response: NativeResponse;
    try {
      response = await CapacitorHttp.request({
        method: "POST",
        url: `${this.baseUrl}/users/refresh-token`,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${refreshToken}`,
        },
        connectTimeout: TIMEOUT_MS,
        readTimeout: TIMEOUT_MS,
      });
    } catch (error: unknown) {
      throw this.handleError(error as { message?: string });
    }

    if (response.status === 401 || response.status === 403) {
      await nativeSession.clear();
      throw sessionExpired();
    }
    if (response.status < 200 || response.status >= 300) {
      throw this.handleError(response);
    }

    const data = (typeof response.data === "string" ? JSON.parse(response.data) : response.data) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!data?.access_token || !data?.refresh_token) {
      throw this.handleError({ status: response.status, message: "Token refresh returned no tokens" });
    }
    await nativeSession.save({ accessToken: data.access_token, refreshToken: data.refresh_token });
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

  /** A file (the exports): CapacitorHttp hands binary bodies back as base64. */
  async getBlob(endpoint: string): Promise<{ blob: Blob; filename: string }> {
    const response = await this.execute({
      method: "GET",
      endpoint,
      headers: { Accept: "*/*" },
      responseType: "blob",
    });
    const binary = atob(String(response.data));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return {
      blob: new Blob([bytes], { type: headerOf(response, "content-type") }),
      filename: extractFilenameFromContentDisposition(headerOf(response, "content-disposition")) ?? "",
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
