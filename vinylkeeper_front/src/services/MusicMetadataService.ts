import { logger } from "@utils/logger";
import { useQuery } from "@tanstack/react-query";
import { AlbumMetadata, ArtistMetadata } from "@models/IRequestProxy";
import { queryKeys } from "@utils/queryKeys";
import { isApiError } from "@utils/apiError";
import { BaseApiService } from "./BaseApiService";

export interface AlbumMetadataParams {
  id: string;
  artist: string;
  title: string;
}

// /request-proxy/* requires a session (login-gated Discogs search): the common client sends it,
// cookies in the browser, Bearer in the Android app, and renews an expired one.
class MusicMetadataApiService extends BaseApiService {
  getAlbum(id: string): Promise<AlbumMetadata> {
    return this.get<AlbumMetadata>(`/request-proxy/music-metadata/album/${encodeURIComponent(id)}`);
  }

  getArtist(id: string): Promise<ArtistMetadata> {
    return this.get<ArtistMetadata>(`/request-proxy/music-metadata/artist/${encodeURIComponent(id)}`);
  }
}

const musicMetadataApiService = new MusicMetadataApiService();

export const fetchAlbumMetadata = async (
  params: AlbumMetadataParams
): Promise<AlbumMetadata> => {
  try {
    return await musicMetadataApiService.getAlbum(params.id);
  } catch (error: unknown) {
    if (isApiError(error) && error.code === 404) {
      throw new Error(`Album with ID ${params.id} not found`, { cause: error });
    }
    throw new Error("Failed to fetch album metadata", { cause: error });
  }
};

export const fetchArtistMetadata = async (
  artistId: string
): Promise<ArtistMetadata> => {
  if (!artistId || artistId === "Unknown Artist" || artistId.trim() === "") {
    logger.warn("Invalid artist ID provided:", artistId);
    return {
      id: "",
      title: "",
      source: "discogs",
      genres: [],
      members: [],
      aliases: [],
    };
  }

  try {
    return await musicMetadataApiService.getArtist(artistId);
  } catch (error) {
    logger.error("Error fetching artist metadata:", error);
    throw new Error("Failed to fetch artist metadata", { cause: error });
  }
};

export const useAlbumMetadata = (params?: AlbumMetadataParams) => {
  return useQuery({
    queryKey: queryKeys.metadata.album(params?.id),
    queryFn: () => params ? fetchAlbumMetadata(params) : Promise.reject(new Error("params required")),
    enabled: !!params?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useArtistMetadata = (artistId?: string) => {
  return useQuery({
    queryKey: queryKeys.metadata.artist(artistId),
    queryFn: () => fetchArtistMetadata(artistId ?? ""),
    enabled: !!artistId && artistId.trim() !== "",
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
