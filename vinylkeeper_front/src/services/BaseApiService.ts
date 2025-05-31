import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
import { ApiResponse, PaginatedResponse } from "@models/BaseTypes";

export abstract class BaseApiService {
  protected readonly baseUrl: string = API_VK_URL;

  protected async get<T>(endpoint: string): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "GET",
      endpoint,
    });
  }

  protected async post<T>(endpoint: string, body?: any): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "POST",
      endpoint,
      body,
    });
  }

  protected async put<T>(endpoint: string, body?: any): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "PUT",
      endpoint,
      body,
    });
  }

  protected async patch<T>(endpoint: string, body?: any): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "PATCH",
      endpoint,
      body,
    });
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "DELETE",
      endpoint,
    });
  }

  protected buildPaginatedEndpoint(
    baseEndpoint: string,
    page: number,
    limit: number
  ): string {
    return `${baseEndpoint}?page=${page}&limit=${limit}`;
  }

  protected handleStandardResponse<T>(response: ApiResponse<T>): T {
    if (!response.success) {
      throw new Error(response.message || "API request failed");
    }
    return response.data!;
  }
}
