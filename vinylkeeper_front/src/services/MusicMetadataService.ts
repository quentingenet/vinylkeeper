import { useQuery } from "@tanstack/react-query";

export interface AlbumMetadata {
  title: string;
  artist: string;
  releaseYear?: number;
  tracklist?: Track[];
  coverArt?: string;
  description?: string;
}

export interface ArtistMetadata {
  name: string;
  biography?: string;
  image?: string;
  genres?: string[];
  country?: string;
  wikipedia_url?: string;
}

export interface Track {
  position: number;
  title: string;
  duration?: string;
}

interface AlbumMetadataResponse {
  title?: string;
  artist?: string;
  release_year?: number;
  tracklist?: Track[];
  cover_art?: string;
  message?: string;
}

interface ArtistMetadataResponse {
  name?: string;
  biography?: string;
  country?: string;
  genres?: string[];
  message?: string;
}

export interface AlbumMetadataParams {
  id: string;
  source: "deezer" | "musicbrainz";
  artist: string;
  title: string;
}

export const fetchAlbumMetadata = async (
  params: AlbumMetadataParams
): Promise<AlbumMetadata> => {
  const searchParams = new URLSearchParams();
  searchParams.append("source", params.source);
  searchParams.append("artist_name", params.artist);
  searchParams.append("album_title", params.title);
  const response = await fetch(
    `${import.meta.env.VITE_API_VK_URL}/music-metadata/album/${
      params.id
    }?${searchParams.toString()}`
  );
  if (!response.ok) {
    throw new Error("Failed to fetch album metadata");
  }
  const data: AlbumMetadataResponse = await response.json();
  return {
    title: data.title || params.title || "Unknown Album",
    artist: data.artist || params.artist || "Unknown Artist",
    releaseYear: data.release_year,
    tracklist: data.tracklist,
    coverArt: data.cover_art,
  };
};

export const fetchArtistMetadata = async (
  artistId: string,
  artistName: string
): Promise<ArtistMetadata> => {
  const params = new URLSearchParams();
  params.append("artist_name", artistName);

  const response = await fetch(
    `${
      import.meta.env.VITE_API_VK_URL
    }/music-metadata/artist/${artistId}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch artist metadata");
  }

  const data: ArtistMetadataResponse = await response.json();

  return {
    name: data.name || artistName,
    biography: data.biography,
    country: data.country,
    genres: data.genres,
  };
};

export const useAlbumMetadata = (params?: AlbumMetadataParams) => {
  return useQuery({
    queryKey: [
      "albumMetadata",
      params?.id,
      params?.source,
      params?.artist,
      params?.title,
    ],
    queryFn: () => fetchAlbumMetadata(params!),
    enabled:
      !!params?.id && !!params?.source && !!params?.artist && !!params?.title,
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useArtistMetadata = (artistId?: string, artistName?: string) => {
  return useQuery({
    queryKey: ["artistMetadata", artistId, artistName],
    queryFn: () => fetchArtistMetadata(artistId!, artistName!),
    enabled: !!artistId && !!artistName,
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
