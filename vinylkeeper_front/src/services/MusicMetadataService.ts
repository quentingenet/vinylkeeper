import { useQuery } from "@tanstack/react-query";
import { AlbumMetadata, ArtistMetadata, Track } from "@models/IRequestProxy";

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
  return await response.json();
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
      title: "",
      source: "discogs",
      genres: [],
      members: [],
      aliases: [],
    };
  }

  const response = await fetch(
    `${
      import.meta.env.VITE_API_VK_URL
    }/request-proxy/music-metadata/artist/${artistId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch artist metadata");
  }

  return await response.json();
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
      const response = await fetch(
        `${this.apiUrl}/request-proxy/search-music`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, is_artist: false }),
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed for query: ${query}`);
      }

      const data = await response.json();
      // Le backend retourne DiscogsData[], mais nous voulons AlbumMetadata[]
      // Nous devons transformer les données
      return data.map((item: any) => ({
        id: item.id,
        title: item.title || item.name || "",
        artist: item.artist?.title || "",
        year: undefined,
        image_url: item.picture,
        source: "discogs",
        genres: [],
        styles: [],
        tracklist: [],
      }));
    } catch (error) {
      console.error("Error searching music:", error);
      throw error;
    }
  }

  async getAlbumMetadata(id: string): Promise<AlbumMetadata> {
    try {
      const response = await fetch(
        `${this.apiUrl}/request-proxy/music-metadata/album/${id}`
      );
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
        source: "discogs",
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
