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
  // The pressing details were shown when this release was picked
  pressing_confirmed?: boolean;
  // Already in the collection: add another copy instead of updating the first one
  add_copy?: boolean;
}

// A pressing of the searched work already in one of the user's collections
export interface OwnedPressing {
  collection_id: number;
  collection_name: string;
  album_id: number;
  external_album_id: string;
  title?: string | null;
  same_release: boolean;
  pressing_confirmed: boolean;
  copies_count: number;
  release_year?: number | null;
  country?: string | null;
  label?: string | null;
  catno?: string | null;
  formats: string[];
}

// The release on the owner's shelf, replacing the one picked by mistake
export type ReplacePressingRequest = Omit<AddToCollectionRequest, "album_data" | "pressing_confirmed" | "add_copy">;

export interface WishlistItemResponse {
  id: number;
  external_id: string;
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
