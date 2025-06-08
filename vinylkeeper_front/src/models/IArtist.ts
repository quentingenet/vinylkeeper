export interface IArtist {
  id: number;
  external_artist_id: string;
  title: string;
  image_url?: string;
  source: string;
  owner_id: number;
  registered_at: string;
  updated_at: string;
  albums?: any[];
  collections_count?: number;
  wishlist_count?: number;
}

export interface IArtistResponse {
  items: IArtist[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
