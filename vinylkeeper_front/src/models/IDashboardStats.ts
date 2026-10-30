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

export type Currency = "EUR" | "USD";

/** Which collection the value is about: the largest one, all of them, or one by id */
export type ValueScope = "largest" | "all" | number;

export interface ValueAmounts {
  currency: Currency;
  low: number;
  average: number;
  high: number;
}

/** Estimated value of a collection, from Discogs suggested prices of its pressings */
export interface CollectionValue {
  collection_id: number | null;
  collections: { id: number; name: string }[];
  /** Currency the user picked in Settings, shown first */
  currency: Currency;
  /** EUR, then USD once a rate is known */
  amounts: ValueAmounts[];
  usd_rate: number | null;
  rate_date: string | null;
  records_total: number;
  records_priced: number;
  pressings_to_confirm: number;
  estimated_at: string | null;
  refresh_pending: number;
  refreshable: number;
  refreshes_left: number;
  next_refresh_at: string | null;
}

export interface ValueRefresh {
  requested: number;
  pending: number;
  estimated_seconds: number;
}
