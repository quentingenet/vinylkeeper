import { PaginatedResponse } from "./BaseTypes";
import { VinylStateEnum } from "@utils/GlobalUtils";

export interface UserMiniResponse {
  username: string;
  user_uuid: string;
}

export interface AlbumBase {
  external_album_id: string;
  title: string;
  image_url?: string;
  external_source: {
    id: number;
    name: string;
  };
}

export interface ArtistBase {
  external_artist_id: string;
  title: string;
  image_url?: string;
  external_source: {
    id: number;
    name: string;
  };
}

export interface CollectionAlbumCopy {
  id: number;
  state_record?: VinylStateEnum | null;
  state_cover?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface CollectionAlbumResponse extends AlbumBase {
  id: number;
  created_at: string;
  updated_at: string;
  collections_count: number;
  loans_count: number;
  wishlist_count: number;
  copies?: CollectionAlbumCopy[];
  copies_count?: number;
  // Groups the pressings of one work (Discogs master)
  external_master_id?: string | null;
  // Pressing of the release, stated as the owner's only once confirmed
  pressing_confirmed?: boolean;
  release_year?: number | null;
  country?: string | null;
  label?: string | null;
  catno?: string | null;
  formats?: string[];
}

export interface CollectionArtistResponse extends ArtistBase {
  id: number;
  created_at: string;
  updated_at: string;
  collections_count: number;
}

export interface CollectionBase {
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
}

export interface CollectionCreate extends CollectionBase {
  album_ids?: number[];
  artist_ids?: number[];
}

export interface CollectionUpdate {
  name?: string;
  description?: string;
  is_public?: boolean;
  mood_id?: number;
}

export interface CollectionInDB extends CollectionBase {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionResponse {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
  created_at: string;
  updated_at: string;
  owner?: UserMiniResponse;
  albums: CollectionAlbumResponse[];
  artists: CollectionArtistResponse[];
  likes_count: number;
  is_liked_by_user: boolean;
}

export interface CollectionListItemResponse {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number | null;
  created_at: string;
  updated_at: string;
  owner?: UserMiniResponse;
  likes_count: number;
  is_liked_by_user: boolean;
  albums_count: number;
  artists_count: number;
  /** Random album covers (max 6, renewed daily), optional for older API versions */
  preview_images?: string[];
  /** Set on a saved copy: the collection it saves */
  saved_from_collection_id?: number | null;
  /** The saved copy of this collection, if any: one save per collection (owner's list only) */
  save_collection_id?: number | null;
  save_collection_name?: string | null;
}

export interface CollectionDetailResponse {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  mood_id: number | null;
  owner_uuid: string | null;
  owner: UserMiniResponse | null;
  likes_count: number;
  is_liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface LikeStatusResponse {
  collection_id: number;
  liked: boolean;
  likes_count: number;
  last_liked_at?: string;
}

export interface CollectionSearchResponse {
  albums: CollectionAlbumResponse[];
  artists: CollectionArtistResponse[];
  query: string;
  search_type: string;
}


// One work of a collection: all its pressings (first added first) and their copies
export interface CollectionRecordResponse {
  work_key: string;
  title?: string | null;
  image_url?: string | null;
  pressings: CollectionAlbumResponse[];
  pressings_count: number;
  copies_count: number;
  created_at: string;
  updated_at: string;
}

export type PaginatedRecordsResponse = PaginatedResponse<CollectionRecordResponse>;

// Condition of one copy, to add a copy or update it (only the fields sent change)
export interface CollectionAlbumCopyData {
  state_record?: VinylStateEnum | null;
  state_cover?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
}
export type PaginatedArtistsResponse = PaginatedResponse<CollectionArtistResponse>;
export type PaginatedCollectionResponse = PaginatedResponse<CollectionResponse>;
export type PaginatedCollectionListResponse = PaginatedResponse<CollectionListItemResponse>;
