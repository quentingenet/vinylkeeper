import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
import { PaginatedResponse } from "@models/BaseTypes";

export abstract class BaseApiService {
  protected readonly baseUrl: string = API_VK_URL;

  protected async get<T>(
    endpoint: string,
    skipRefresh: boolean = false
  ): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "GET",
      endpoint,
      skipRefresh,
    });
  }

  protected async post<T>(
    endpoint: string,
    body?: any,
    skipRefresh: boolean = false
  ): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "POST",
      endpoint,
      body,
      skipRefresh,
    });
  }

  protected async put<T>(
    endpoint: string,
    body?: any,
    skipRefresh: boolean = false
  ): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "PUT",
      endpoint,
      body,
      skipRefresh,
    });
  }

  protected async patch<T>(
    endpoint: string,
    body?: any,
    skipRefresh: boolean = false
  ): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "PATCH",
      endpoint,
      body,
      skipRefresh,
    });
  }

  protected async delete<T>(
    endpoint: string,
    skipRefresh: boolean = false
  ): Promise<T> {
    return requestService<T>({
      apiTarget: this.baseUrl,
      method: "DELETE",
      endpoint,
      skipRefresh,
    });
  }

  protected buildPaginatedEndpoint(
    baseEndpoint: string,
    page: number,
    limit: number
  ): string {
    return `${baseEndpoint}?page=${page}&limit=${limit}`;
  }
}
