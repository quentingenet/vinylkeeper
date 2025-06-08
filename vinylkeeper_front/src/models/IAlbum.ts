export interface IAlbum {
  id: number;
  external_album_id: string;
  title: string;
  image_url?: string;
  source: string;
  state_record?: string;
  state_cover?: string;
  acquisition_date?: string;
  purchase_price?: number;
  owner_id: number;
  registered_at: string;
  updated_at: string;
  artists?: any[];
  collections_count?: number;
  loans_count?: number;
  wishlist_count?: number;
}

export interface IAlbumResponse {
  items: IAlbum[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
