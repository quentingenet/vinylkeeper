import { useQuery } from "@tanstack/react-query";

export interface AlbumMetadata {
  id: number;
  title: string;
  artist: string;
  picture?: string;
  release_year?: number;
  genres: string[];
  styles: string[];
  tracklist: Track[];
}

export interface ArtistMetadata {
  name: string;
  biography?: string;
  image?: string;
  genres?: string[];
  country?: string;
  wikipedia_url?: string;
  discogs_id?: string;
  discogs_url?: string;
  members?: string[];
  active_years?: string;
  aliases?: string[];
}

export interface Track {
  position: string;
  title: string;
  duration: string;
}

interface AlbumMetadataResponse {
  id: number;
  title: string;
  artist: string;
  picture?: string;
  release_year?: number;
  genres: string[];
  styles: string[];
  tracklist: Track[];
}

interface ArtistMetadataResponse {
  name: string;
  biography?: string;
  image?: string;
  genres?: string[];
  country?: string;
  wikipedia_url?: string;
  discogs_id?: string;
  discogs_url?: string;
  members?: string[];
  active_years?: string;
  aliases?: string[];
}

export interface AlbumMetadataParams {
  id: string;
  artist: string;
  title: string;
}

export const fetchAlbumMetadata = async (
  params: AlbumMetadataParams
): Promise<AlbumMetadata> => {
  const response = await fetch(
    `${
      import.meta.env.VITE_API_VK_URL
    }/request-proxy/music-metadata/album?album_id=${params.id}`
  );
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Album with ID ${params.id} not found on Discogs`);
    }
    throw new Error("Failed to fetch album metadata");
  }
  const data: AlbumMetadataResponse = await response.json();
  return {
    id: data.id,
    title: data.title,
    artist: data.artist,
    picture: data.picture,
    release_year: data.release_year,
    genres: data.genres,
    styles: data.styles,
    tracklist: data.tracklist,
  };
};

export const fetchArtistMetadata = async (
  artistId: string
): Promise<ArtistMetadata> => {
  if (!artistId || artistId === "Unknown Artist") {
    return {
      name: "",
      biography: undefined,
      image: undefined,
      genres: [],
      country: undefined,
      wikipedia_url: undefined,
      discogs_id: undefined,
      discogs_url: undefined,
      members: [],
      active_years: undefined,
      aliases: [],
    };
  }

  const response = await fetch(
    `${
      import.meta.env.VITE_API_VK_URL
    }/request-proxy/music-metadata/artist?artist_id=${artistId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch artist metadata");
  }

  const data: ArtistMetadataResponse = await response.json();

  return {
    name: data.name || "",
    biography: data.biography,
    country: data.country,
    genres: data.genres,
    image: data.image,
    wikipedia_url: data.wikipedia_url,
    discogs_id: data.discogs_id,
    discogs_url: data.discogs_url,
    members: data.members,
    active_years: data.active_years,
    aliases: data.aliases,
  };
};

export const useAlbumMetadata = (params?: AlbumMetadataParams) => {
  return useQuery({
    queryKey: ["albumMetadata", params?.id],
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
    queryKey: ["artistMetadata", artistId],
    queryFn: () => fetchArtistMetadata(artistId!),
    enabled: !!artistId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
