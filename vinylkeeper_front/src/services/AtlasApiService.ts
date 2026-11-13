import { BaseApiService } from "./BaseApiService";

export interface PlaceTypeData {
  id: number;
  name: string;
}

export interface PlaceMapResponse {
  id: number;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  name: string;
  /** Name of the spot type */
  place_type?: string | null;
}

export interface Place {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  source_url?: string;
  place_type: {
    id: number;
    name: string;
  };
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}

interface PlaceLikeStatusResponse {
  place_id: number;
  is_liked: boolean;
  likes_count: number;
  message: string;
}

interface PlaceMutationResponse {
  message: string;
  place: Place;
}

export interface CreatePlaceData {
  name: string;
  address: string;
  city: string;
  country: string;
  description?: string;
  source_url?: string;
  place_type_id: number;
  latitude?: number;
  longitude?: number;
}

class AtlasApiService extends BaseApiService {
  async getPlacesMap(): Promise<PlaceMapResponse[]> {
    return this.get<PlaceMapResponse[]>("/atlas/map");
  }

  async getPlacesByLocation(country: string, city: string): Promise<Place[]> {
    return this.get<Place[]>(
      `/atlas/by-location?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`
    );
  }

  async createPlace(data: CreatePlaceData): Promise<PlaceMutationResponse> {
    return this.post<PlaceMutationResponse>("/atlas/", data);
  }

  async updatePlace(
    id: number,
    data: Partial<CreatePlaceData>
  ): Promise<PlaceMutationResponse> {
    return this.patch<PlaceMutationResponse>(`/atlas/${id}`, data);
  }

  /** Members only: the admins get an email and fix the spot from the admin panel */
  async reportPlace(id: number, issues: string[], comment: string): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/atlas/${id}/reports`, { issues, comment: comment.trim() || null });
  }

  async likePlace(id: number): Promise<PlaceLikeStatusResponse> {
    return this.post<PlaceLikeStatusResponse>(`/atlas/${id}/like`);
  }

  async unlikePlace(id: number): Promise<PlaceLikeStatusResponse> {
    return this.delete<PlaceLikeStatusResponse>(`/atlas/${id}/like`);
  }

  async getPlaceTypes(): Promise<PlaceTypeData[]> {
    return this.get<PlaceTypeData[]>("/atlas/place-types");
  }
}

export const atlasApiService = new AtlasApiService();
