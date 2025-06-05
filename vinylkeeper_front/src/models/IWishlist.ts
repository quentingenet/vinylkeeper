import { ExternalItem, PaginatedResponse } from "./BaseTypes";

export interface WishlistItem {
  id: number;
  user_id: number;
  external_id: string;
  entity_type: "album" | "artist";
  title: string;
  image_url: string;
  source: "discogs" | "musicbrainz";
  created_at: string;
  album?: any;
  artist?: any;
  user?: any;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

// Compatibility aliases (to be removed progressively)
export interface IWishlistItem extends WishlistItem {}
