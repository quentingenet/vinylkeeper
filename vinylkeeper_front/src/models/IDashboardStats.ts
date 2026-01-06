export interface LatestAddition {
  id: number;
  name: string;
  username: string;
  created_at: string;
  type: string;
  image_url?: string;
  external_id?: string;
}

export interface IDashboardStats {
  user_albums_total: number;
  user_artists_total: number;
  user_collections_total: number;
  user_public_collections_total: number;
  global_albums_total: number;
  global_artists_total: number;
  global_places_total: number;
  moderated_places_total: number;
  public_collections_total: number;
  latest_album?: LatestAddition;
  latest_artist?: LatestAddition;
  recent_albums?: LatestAddition[];
}
