import { logger } from "@utils/logger";
import { BaseApiService } from "./BaseApiService";
import {
  IRequestToSend,
  AlbumMetadata,
  ArtistMetadata,
  DiscogsData,
} from "@models/IRequestProxy";

export class SearchApiService extends BaseApiService {
  private cache: Map<string, unknown> = new Map();

  async searchMusic(requestToSend: IRequestToSend): Promise<DiscogsData[]> {
    try {
      return await this.post<DiscogsData[]>(
        "/request-proxy/search-music",
        requestToSend
      );
    } catch (error) {
      logger.error("Search failed:", error);
      throw new Error("Failed to search music");
    }
  }

  async getArtistMetadata(artistId: string): Promise<ArtistMetadata> {
    if (!artistId || artistId.trim() === "") {
      logger.warn("Invalid artist ID provided:", artistId);
      throw new Error("Invalid artist ID provided");
    }

    // Validate that artistId is numeric
    if (!/^\d+$/.test(artistId)) {
      logger.warn("Non-numeric artist ID provided:", artistId);
      throw new Error("Artist ID must be numeric");
    }

    try {
      return await this.get<ArtistMetadata>(
        `/request-proxy/music-metadata/artist/${artistId}`
      );
    } catch (error) {
      logger.error("Failed to fetch artist metadata:", error);
      throw new Error("Failed to fetch artist metadata");
    }
  }

  async getAlbumMetadata(albumId: string): Promise<AlbumMetadata> {
    if (!albumId || albumId.trim() === "") {
      logger.warn("Invalid album ID provided:", albumId);
      throw new Error("Invalid album ID provided");
    }

    // Validate that albumId is numeric
    if (!/^\d+$/.test(albumId)) {
      logger.warn("Non-numeric album ID provided:", albumId);
      throw new Error("Album ID must be numeric");
    }

    try {
      return await this.get<AlbumMetadata>(
        `/request-proxy/music-metadata/album/${albumId}`
      );
    } catch (error) {
      logger.error("Failed to fetch album metadata:", error);
      throw new Error("Failed to fetch album metadata");
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

const searchApiServiceInstance = new SearchApiService();

export const searchApiService = {
  searchMusic: (requestToSend: IRequestToSend) =>
    searchApiServiceInstance.searchMusic(requestToSend),
  getArtistMetadata: (artistId: string) =>
    searchApiServiceInstance.getArtistMetadata(artistId),
  getAlbumMetadata: (albumId: string) =>
    searchApiServiceInstance.getAlbumMetadata(albumId),
  clearCache: () => searchApiServiceInstance.clearCache(),
};

export default searchApiService;
