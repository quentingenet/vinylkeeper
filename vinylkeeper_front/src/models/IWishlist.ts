export interface IWishlistItem {
  id: number;
  external_id: string;
  title: string;
  artist_name?: string;
  picture_medium?: string;
  external_source: string;
  item_type: string;
  created_at: string;
}

export interface IWishlistResponse {
  items: IWishlistItem[];
  total: number;
}
