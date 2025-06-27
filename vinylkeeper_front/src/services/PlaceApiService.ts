import { BaseApiService } from "./BaseApiService";
import requestService from "@utils/RequestService";
import { PlaceType } from "@utils/GlobalUtils";

export interface PlaceTypeData {
  id: number;
  name: string;
}

export interface Place {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  description?: string;
  source_url?: string;
  place_type: {
    id: number;
    name: string;
  };
  submitted_by?: {
    id: number;
    username: string;
  };
  is_moderated: boolean;
  is_valid: boolean;
  likes_count: number;
  is_liked?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePlaceData {
  name: string;
  address: string;
  city: string;
  country: string;
  description?: string;
  source_url?: string;
  place_type_id: PlaceType;
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
  async getPlaces(): Promise<Place[]> {
    return this.get<Place[]>("/places/");
  }

  async getPlace(id: number): Promise<Place> {
    return this.get<Place>(`/places/${id}`);
  }

  async createPlace(data: CreatePlaceData): Promise<Place> {
    return this.post<Place>("/places/", data);
  }

  async updatePlace(
    id: number,
    data: Partial<CreatePlaceData>
  ): Promise<Place> {
    return this.put<Place>(`/places/${id}`, data);
  }

  async deletePlace(id: number): Promise<void> {
    return this.delete<void>(`/places/${id}`);
  }

  async likePlace(id: number): Promise<void> {
    return this.post<void>(`/places/${id}/like`);
  }

  async unlikePlace(id: number): Promise<void> {
    return this.delete<void>(`/places/${id}/like`);
  }

  async getPlaceTypes(): Promise<PlaceTypeData[]> {
    return this.get<PlaceTypeData[]>("/place-types/");
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
