import { BaseApiService } from "./BaseApiService";
import { IRequestResults, IRequestToSend } from "@models/IRequestProxy";

export interface SearchQuery {
  query: string;
  isArtist?: boolean;
}

export interface SearchResults {
  type: string;
  data: any[];
}

export class SearchApiService extends BaseApiService {
  async searchMusic(requestToSend: IRequestToSend): Promise<IRequestResults> {
    return this.post<IRequestResults>("/request-proxy/search", requestToSend);
  }

  // Alias for backward compatibility
  async searchProxy(requestToSend: IRequestToSend): Promise<IRequestResults> {
    return this.searchMusic(requestToSend);
  }
}

// Export singleton instance
export const searchApiService = new SearchApiService();
