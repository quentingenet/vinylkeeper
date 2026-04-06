import { useQuery } from "@tanstack/react-query";
import { AlbumMetadata, ArtistMetadata } from "@models/IRequestProxy";
import { queryKeys } from "@utils/queryKeys";

export interface AlbumMetadataParams {
  id: string;
  artist: string;
  title: string;
}

export const fetchAlbumMetadata = async (
  params: AlbumMetadataParams
): Promise<AlbumMetadata> => {
  const response = await fetch(
    `${import.meta.env.VITE_API_VK_URL}/request-proxy/music-metadata/album/${
      params.id
    }`
  );
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Album with ID ${params.id} not found`);
    }
    throw new Error("Failed to fetch album metadata");
  }
  return await response.json() as AlbumMetadata;
};

export const fetchArtistMetadata = async (
  artistId: string
): Promise<ArtistMetadata> => {
  if (!artistId || artistId === "Unknown Artist" || artistId.trim() === "") {
    console.warn("Invalid artist ID provided:", artistId);
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
    const response = await fetch(
      `${
        import.meta.env.VITE_API_VK_URL
      }/request-proxy/music-metadata/artist/${artistId}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Artist metadata fetch failed:",
        response.status,
        errorText
      );
      throw new Error(
        `Failed to fetch artist metadata: ${response.status} ${errorText}`
      );
    }

    return await response.json() as ArtistMetadata;
  } catch (error) {
    console.error("Error fetching artist metadata:", error);
    throw error;
  }
};

export const useAlbumMetadata = (params?: AlbumMetadataParams) => {
  return useQuery({
    queryKey: queryKeys.metadata.album(params?.id),
    queryFn: () => fetchAlbumMetadata(params!),
    enabled: !!params?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useArtistMetadata = (artistId?: string) => {
  return useQuery({
    queryKey: queryKeys.metadata.artist(artistId),
    queryFn: () => fetchArtistMetadata(artistId!),
    enabled: !!artistId && artistId.trim() !== "",
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
