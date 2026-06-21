import { BaseApiService } from "./BaseApiService";
import requestService from "@utils/RequestService";

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

export interface PaginatedPlaceResponse {
  items: Place[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PlaceLikeStatusResponse {
  place_id: number;
  is_liked: boolean;
  likes_count: number;
  message: string;
}

export interface PlaceMutationResponse {
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

export interface GeocodingResult {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    country?: string;
    postcode?: string;
  };
}

class PlaceApiService extends BaseApiService {
  async getPlacesMap(): Promise<PlaceMapResponse[]> {
    return this.get<PlaceMapResponse[]>("/places/map");
  }

  async getPlacesByLocation(country: string, city: string): Promise<Place[]> {
    return this.get<Place[]>(
      `/places/by-location?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`
    );
  }

  async getPlaces(page = 1, limit = 20): Promise<PaginatedPlaceResponse> {
    return this.get<PaginatedPlaceResponse>(`/places/?page=${page}&limit=${limit}`);
  }

  async getPlace(id: number): Promise<Place> {
    return this.get<Place>(`/places/${id}`);
  }

  async createPlace(data: CreatePlaceData): Promise<PlaceMutationResponse> {
    return this.post<PlaceMutationResponse>("/places/", data);
  }

  async updatePlace(
    id: number,
    data: Partial<CreatePlaceData>
  ): Promise<PlaceMutationResponse> {
    return this.patch<PlaceMutationResponse>(`/places/${id}`, data);
  }

  async deletePlace(id: number): Promise<void> {
    return this.delete<void>(`/places/${id}`);
  }

  async likePlace(id: number): Promise<PlaceLikeStatusResponse> {
    return this.post<PlaceLikeStatusResponse>(`/places/${id}/like`);
  }

  async unlikePlace(id: number): Promise<PlaceLikeStatusResponse> {
    return this.delete<PlaceLikeStatusResponse>(`/places/${id}/like`);
  }

  async getPlaceTypes(): Promise<PlaceTypeData[]> {
    return this.get<PlaceTypeData[]>("/places/place-types");
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
    return requestService<GeocodingResult>({
      apiTarget: "https://nominatim.openstreetmap.org",
      method: "GET",
      endpoint: `/reverse?lat=${lat}&lon=${lng}&format=json`,
      headers: {
        "User-Agent": "VinylKeeper/1.0 (https://vinylkeeper.org)",
      },
      skipRefresh: true, // Skip token refresh for external API
    });
  }
}

export const placeApiService = new PlaceApiService();
