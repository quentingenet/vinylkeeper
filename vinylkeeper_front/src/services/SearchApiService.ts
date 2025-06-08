import { BaseApiService } from "./BaseApiService";
import { IRequestToSend, IRequestResults } from "@models/IRequestProxy";

export interface SearchQuery {
  query: string;
  isArtist?: boolean;
}

export interface SearchResults {
  type: string;
  data: any[];
}

export class SearchApiService extends BaseApiService {
  private readonly CACHE_TIME = 5 * 60 * 1000; // 5 minutes
  private searchCache: Map<
    string,
    { data: IRequestResults; timestamp: number }
  > = new Map();

  private getCacheKey(query: string, isArtist: boolean): string {
    return `${query}-${isArtist}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TIME;
  }

  async searchMusic(requestToSend: IRequestToSend): Promise<IRequestResults> {
    const cacheKey = this.getCacheKey(
      requestToSend.query,
      requestToSend.is_artist
    );
    const cachedResult = this.searchCache.get(cacheKey);

    if (cachedResult && this.isCacheValid(cachedResult.timestamp)) {
      return cachedResult.data;
    }

    try {
      const result = await this.post<IRequestResults>(
        "/request-proxy/search-music",
        requestToSend
      );

      this.searchCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("Search error:", error);
      throw new Error("Failed to search music. Please try again.");
    }
  }

  // Alias for backward compatibility
  async searchProxy(requestToSend: IRequestToSend): Promise<IRequestResults> {
    return this.searchMusic(requestToSend);
  }

  clearCache(): void {
    this.searchCache.clear();
  }
}

const searchApiServiceInstance = new SearchApiService();

export const searchApiService = {
  searchMusic: (requestToSend: IRequestToSend) =>
    searchApiServiceInstance.searchMusic(requestToSend),
  searchProxy: (requestToSend: IRequestToSend) =>
    searchApiServiceInstance.searchProxy(requestToSend),
  clearCache: () => searchApiServiceInstance.clearCache(),
};

export default searchApiService;
