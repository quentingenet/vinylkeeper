import { BaseApiService } from "./BaseApiService";
import {
  IRequestToSend,
  AlbumMetadata,
  ArtistMetadata,
  DiscogsData,
} from "@models/IRequestProxy";

export class SearchApiService extends BaseApiService {
  private cache: Map<string, any> = new Map();

  async searchMusic(requestToSend: IRequestToSend): Promise<DiscogsData[]> {
    try {
      return await this.post<DiscogsData[]>(
        "/request-proxy/search-music",
        requestToSend
      );
    } catch (error) {
      console.error("Search failed:", error);
      throw new Error("Failed to search music");
    }
  }

  async getArtistMetadata(artistId: string): Promise<ArtistMetadata> {
    if (!artistId || artistId.trim() === "") {
      console.warn("Invalid artist ID provided:", artistId);
      throw new Error("Invalid artist ID provided");
    }

    try {
      return await this.get<ArtistMetadata>(
        `/request-proxy/music-metadata/artist/${artistId}`
      );
    } catch (error) {
      console.error("Failed to fetch artist metadata:", error);
      throw new Error("Failed to fetch artist metadata");
    }
  }

  async getAlbumMetadata(albumId: string): Promise<AlbumMetadata> {
    try {
      return await this.get<AlbumMetadata>(
        `/request-proxy/music-metadata/album/${albumId}`
      );
    } catch (error) {
      console.error("Failed to fetch album metadata:", error);
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
