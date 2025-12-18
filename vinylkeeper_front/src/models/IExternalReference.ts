import { VinylStateEnum } from "@utils/GlobalUtils";

export interface AlbumStateData {
  state_cover?: VinylStateEnum | null;
  state_record?: VinylStateEnum | null;
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

export interface WishlistItemListResponse {
  id: number;
  entity_type: string;
  external_id: string;
  title: string;
  image_url: string | null;
  created_at: string;
}

export interface PaginatedWishlistResponse {
  items: WishlistItemListResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
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

export interface AddToWishlistResponse {
  item: WishlistItemResponse;
  is_new: boolean;
  message: string;
  entity_type: string;
}

export interface AddToCollectionResponse {
  item: CollectionItemResponse;
  is_new: boolean;
  message: string;
  entity_type: string;
  collection_name: string;
}
