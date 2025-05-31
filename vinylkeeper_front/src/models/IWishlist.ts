import { ExternalItem, PaginatedResponse } from "./BaseTypes";

export interface WishlistItem extends ExternalItem {
  // Inherits all standardized fields from ExternalItem
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

// Compatibility aliases (to be removed progressively)
export interface IWishlistItem extends WishlistItem {}
export interface IWishlistResponse extends WishlistResponse {}
