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

export interface BreakdownEntry {
  label: string;
  count: number;
}

export interface EraEntry {
  decade: number;
  count: number;
}

export interface PressingsBreakdown {
  originals: number;
  reissues: number;
  unknown: number;
  countries: BreakdownEntry[];
  formats: BreakdownEntry[];
}

/** The records of the user, or of one of their collections, by era, genre, mood and pressing */
export interface CollectionBreakdown {
  collection_id: number | null;
  collections: { id: number; name: string }[];
  albums_total: number;
  eras: EraEntry[];
  genres: BreakdownEntry[];
  moods: BreakdownEntry[];
  pressings: PressingsBreakdown;
}
