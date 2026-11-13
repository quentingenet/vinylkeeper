import { logger } from "@utils/logger";
import { BaseApiService } from "./BaseApiService";
import {
  IRequestToSend,
  SearchResultsPage,
} from "@models/IRequestProxy";

export class SearchApiService extends BaseApiService {
  async searchMusicPage(requestToSend: IRequestToSend): Promise<SearchResultsPage> {
    try {
      return await this.post<SearchResultsPage>(
        "/request-proxy/search-music/page",
        requestToSend
      );
    } catch (error) {
      logger.error("Search failed:", error);
      throw new Error("Failed to search music", { cause: error });
    }
  }
}

const searchApiServiceInstance = new SearchApiService();

export const searchApiService = {
  searchMusicPage: (requestToSend: IRequestToSend) =>
    searchApiServiceInstance.searchMusicPage(requestToSend),
};

export default searchApiService;
