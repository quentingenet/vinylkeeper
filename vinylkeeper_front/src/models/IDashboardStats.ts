export interface TimeSeriesData {
  label: string;
  data: number[];
}

export interface IDashboardStats {
  labels: string[];
  datasets: TimeSeriesData[];
  user_albums_total: number;
  user_artists_total: number;
  user_collections_total: number;
  global_places_total: number;
}
