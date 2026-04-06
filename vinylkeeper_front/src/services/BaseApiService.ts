import requestService from "@utils/RequestService";
import { capacitorHttpService } from "@utils/CapacitorHttpService";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { API_VK_URL } from "@utils/GlobalUtils";
import { type ApiError } from "@utils/apiError";
import { extractFilenameFromContentDisposition } from "@utils/DownloadUtils";

export abstract class BaseApiService {
  protected readonly baseUrl: string = API_VK_URL;

  protected async get<T>(endpoint: string, skipRefresh: boolean = false): Promise<T> {
    if (isCapacitorPlatform()) {
      return capacitorHttpService.get<T>(endpoint, skipRefresh);
    }
    return requestService<T>({ apiTarget: this.baseUrl, method: "GET", endpoint, skipRefresh });
  }

  protected async post<T>(endpoint: string, body?: unknown, skipRefresh: boolean = false): Promise<T> {
    if (isCapacitorPlatform()) {
      return capacitorHttpService.post<T>(endpoint, body, skipRefresh);
    }
    return requestService<T>({ apiTarget: this.baseUrl, method: "POST", endpoint, body, skipRefresh });
  }

  protected async put<T>(endpoint: string, body?: unknown, skipRefresh: boolean = false): Promise<T> {
    if (isCapacitorPlatform()) {
      return capacitorHttpService.put<T>(endpoint, body, skipRefresh);
    }
    return requestService<T>({ apiTarget: this.baseUrl, method: "PUT", endpoint, body, skipRefresh });
  }

  protected async patch<T>(endpoint: string, body?: unknown, skipRefresh: boolean = false): Promise<T> {
    if (isCapacitorPlatform()) {
      return capacitorHttpService.patch<T>(endpoint, body, skipRefresh);
    }
    return requestService<T>({ apiTarget: this.baseUrl, method: "PATCH", endpoint, body, skipRefresh });
  }

  protected async delete<T>(endpoint: string, skipRefresh: boolean = false): Promise<T> {
    if (isCapacitorPlatform()) {
      return capacitorHttpService.delete<T>(endpoint, skipRefresh);
    }
    return requestService<T>({ apiTarget: this.baseUrl, method: "DELETE", endpoint, skipRefresh });
  }

  protected async blobGet(endpoint: string): Promise<{ blob: Blob; filename: string }> {
    const url = `${this.baseUrl}${endpoint}`;

    const execute = async (retrying = false): Promise<Response> => {
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "*/*" },
      });

      if (response.status === 401 && !retrying) {
        const refreshResp = await fetch(`${this.baseUrl}/users/refresh-token`, {
          method: "POST",
          credentials: "include",
        });
        if (!refreshResp.ok) {
          throw { code: 401, message: "Session expired. Please log in again.", details: {} } satisfies ApiError;
        }
        return execute(true);
      }

      if (!response.ok) {
        let message = `Export failed (${response.status})`;
        try {
          const data = (await response.json()) as { message?: string };
          message = data.message ?? message;
        } catch { /* ignore */ }
        throw { code: response.status, message, details: {} } satisfies ApiError;
      }

      return response;
    };

    const response = await execute();
    const blob = await response.blob();
    const filename = extractFilenameFromContentDisposition(
      response.headers.get("content-disposition")
    ) ?? "";

    return { blob, filename };
  }

  protected buildPaginatedEndpoint(baseEndpoint: string, page: number, limit: number): string {
    return `${baseEndpoint}?page=${page}&limit=${limit}`;
  }
}
