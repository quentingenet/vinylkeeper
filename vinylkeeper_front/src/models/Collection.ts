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

export interface AlbumInCollection {
  state_record?: VinylStateEnum | null;
  state_cover?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
}

export interface CollectionAlbumResponse extends AlbumBase, AlbumInCollection {
  id: number;
  created_at: string;
  updated_at: string;
  collections_count: number;
  loans_count: number;
  wishlist_count: number;
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
  image_preview?: string | null;
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

export type PaginatedAlbumsResponse = PaginatedResponse<CollectionAlbumResponse>;
export type PaginatedArtistsResponse = PaginatedResponse<CollectionArtistResponse>;
export type PaginatedCollectionResponse = PaginatedResponse<CollectionResponse>;
export type PaginatedCollectionListResponse = PaginatedResponse<CollectionListItemResponse>;
