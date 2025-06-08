import { useQuery } from "@tanstack/react-query";

export interface Track {
  position: string;
  title: string;
  duration: string;
}

export interface AlbumMetadata {
  id: string;
  title: string;
  artist: string;
  year?: string;
  image_url?: string;
  external_id?: string;
  external_url?: string;
  source: string;
  genres?: string[];
  styles?: string[];
  tracklist?: Track[];
}

export interface ArtistMetadata {
  id: string;
  name: string;
  image_url?: string;
  external_id?: string;
  external_url?: string;
  source: string;
  biography?: string;
  genres?: string[];
  country?: string;
  wikipedia_url?: string;
  members?: string[];
  active_years?: string;
  aliases?: string[];
}

interface AlbumMetadataResponse {
  id: string;
  title: string;
  artist: string;
  year?: string;
  image_url?: string;
  genres: string[];
  styles: string[];
  tracklist: Array<{
    position: string;
    title: string;
    duration: string;
  }>;
  source: string;
}

interface ArtistMetadataResponse {
  id: string;
  name: string;
  image_url?: string;
  biography?: string;
  genres: string[];
  country?: string;
  wikipedia_url?: string;
  external_id?: string;
  external_url?: string;
  members: string[];
  active_years?: string;
  aliases: string[];
  source: string;
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
    year: data.year,
    image_url: data.image_url,
    external_id: undefined,
    external_url: undefined,
    source: data.source,
    genres: data.genres,
    styles: data.styles,
    tracklist: data.tracklist,
  };
};

async function fetchWikipediaContent(url: string): Promise<string> {
  if (!url) return "";
  try {
    // Extraire le titre de la page depuis l'URL
    const title = url.split("/").pop()?.replace(/_/g, " ") || "";
    const apiUrl = `https://fr.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(
      title
    )}&origin=*`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch Wikipedia content");
    }

    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    return pages[pageId].extract || "";
  } catch (error) {
    console.error("Error fetching Wikipedia content:", error);
    return "";
  }
}

export const fetchArtistMetadata = async (
  artistId: string
): Promise<ArtistMetadata> => {
  if (!artistId || artistId === "Unknown Artist") {
    return {
      id: "",
      name: "",
      image_url: undefined,
      external_id: undefined,
      external_url: undefined,
      source: "",
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
    id: data.id,
    name: data.name,
    image_url: data.image_url,
    biography: data.biography,
    genres: data.genres,
    country: data.country,
    wikipedia_url: data.wikipedia_url,
    external_id: data.external_id,
    external_url: data.external_url,
    members: data.members,
    active_years: data.active_years,
    aliases: data.aliases,
    source: data.source,
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

export class MusicMetadataService {
  private static instance: MusicMetadataService;
  private apiUrl: string;

  private constructor() {
    this.apiUrl = import.meta.env.VITE_API_VK_URL;
  }

  public static getInstance(): MusicMetadataService {
    if (!MusicMetadataService.instance) {
      MusicMetadataService.instance = new MusicMetadataService();
    }
    return MusicMetadataService.instance;
  }

  async searchMusic(query: string): Promise<AlbumMetadata[]> {
    try {
      const response = await fetch(`${this.apiUrl}/search-music`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Album with ID ${query} not found`);
      }

      const data = await response.json();
      return data.map((item: any) => ({
        id: item.id,
        title: item.title,
        artist: item.artist,
        year: item.year,
        image_url: item.image_url,
        external_id: undefined,
        external_url: undefined,
        source: item.source,
        genres: item.genres,
        styles: item.styles,
        tracklist: item.tracklist,
      }));
    } catch (error) {
      console.error("Error searching music:", error);
      throw error;
    }
  }

  async getAlbumMetadata(id: string): Promise<AlbumMetadata> {
    try {
      const response = await fetch(`${this.apiUrl}/album/${id}`);
      if (!response.ok) {
        throw new Error(`Album with ID ${id} not found`);
      }

      const data = await response.json();
      return {
        id: data.id.toString(),
        title: data.title,
        artist: data.artist,
        year: data.year,
        image_url: data.image_url,
        external_id: data.external_id,
        external_url: data.external_url,
        source: data.source,
        genres: data.genres,
        styles: data.styles,
        tracklist: data.tracklist,
      };
    } catch (error) {
      console.error("Error fetching album metadata:", error);
      throw error;
    }
  }
}
