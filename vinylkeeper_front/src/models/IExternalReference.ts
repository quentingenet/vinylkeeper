import { ExternalItem } from "./BaseTypes";

export interface AlbumStateData {
  state_cover?: string | null;
  state_record?: string | null;
  acquisition_month_year?: string | null;
}

export interface AddToWishlistRequest {
  external_id: string;
  entity_type: "album" | "artist";
  title: string;
  image_url: string;
  source: "discogs" | "musicbrainz";
}

export interface AddToCollectionRequest {
  external_id: string;
  entity_type: "album" | "artist";
  title: string;
  image_url: string;
  source: "discogs" | "musicbrainz";
  album_data?: AlbumStateData;
}

export interface WishlistItemResponse {
  id: number;
  user_id: number;
  external_id: string;
  entity_type_id: number;
  external_source_id: number;
  title: string;
  image_url: string;
  created_at: string;
  entity_type: string;
  source: string;
}

export interface CollectionItemResponse {
  id: number;
  user_id: number;
  external_id: string;
  entity_type: string;
  title: string;
  image_url: string;
  source: string;
  created_at: string;
}

export interface AddExternalResponse {
  success: boolean;
  message: string;
}
