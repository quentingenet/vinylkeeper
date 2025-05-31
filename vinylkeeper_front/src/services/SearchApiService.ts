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
  async searchMusic(requestToSend: IRequestToSend): Promise<IRequestResults> {
    return this.post<IRequestResults>("/request-proxy/search", requestToSend);
  }

  // Alias for backward compatibility
  async searchProxy(requestToSend: IRequestToSend): Promise<IRequestResults> {
    return this.searchMusic(requestToSend);
  }
}

const searchApiServiceInstance = new SearchApiService();

export const searchApiService = {
  searchMusic: (requestToSend: IRequestToSend) =>
    searchApiServiceInstance.searchMusic(requestToSend),
  searchProxy: (requestToSend: IRequestToSend) =>
    searchApiServiceInstance.searchProxy(requestToSend),
};

export default searchApiService;
