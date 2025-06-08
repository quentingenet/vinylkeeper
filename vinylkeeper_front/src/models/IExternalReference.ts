import { ExternalItem } from "./BaseTypes";

export interface AddToWishlistRequest {
  external_id: string;
  entity_type: "ALBUM" | "ARTIST";
  title: string;
  image_url: string;
  source: "DISCOGS" | "MUSICBRAINZ";
}

export interface AddToCollectionRequest {
  collectionId: number;
  external_id: string;
  entity_type: "ALBUM" | "ARTIST";
  title: string;
  image_url: string;
  source: "DISCOGS" | "MUSICBRAINZ";
}

export interface WishlistItemResponse {
  id: number;
  user_id: number;
  external_id: string;
  entity_type: "ALBUM" | "ARTIST";
  title: string;
  image_url: string;
  source: "DISCOGS" | "MUSICBRAINZ";
  created_at: string;
  album?: any;
  artist?: any;
  user?: any;
}

export interface CollectionItemResponse {
  id: number;
  user_id: number;
  external_id: string;
  entity_type: "ALBUM" | "ARTIST";
  title: string;
  image_url: string;
  source: "DISCOGS" | "MUSICBRAINZ";
  created_at: string;
}

export interface AddExternalResponse {
  success: boolean;
  message: string;
}
