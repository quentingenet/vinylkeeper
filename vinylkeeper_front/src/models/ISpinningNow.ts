export interface MoodOption {
  name: string;
  description: string | null;
  albums_count: number;
}

export interface EraOption {
  /** First year of the decade, e.g. 1970 */
  decade: number;
  albums_count: number;
}

export interface GenreOption {
  name: string;
  albums_count: number;
}

export interface CollectionOption {
  id: number;
  name: string;
  albums_count: number;
}

export interface SpinningNowOptions {
  total_albums: number;
  moods: MoodOption[];
  eras: EraOption[];
  genres: GenreOption[];
  collections: CollectionOption[];
}

export interface SpinningNowFilters {
  moods: string[];
  eras: number[];
  genres: string[];
  collections: number[];
}

export interface CollectionRef {
  id: number;
  name: string;
}

export interface SpinningNowAlbum {
  id: number;
  external_album_id: string;
  title: string | null;
  artist_name: string | null;
  image_url: string | null;
  /** Original release year, or pressing year when unknown */
  year: number | null;
  genres: string[];
  styles: string[];
  moods: string[];
  /** The user's collections holding this album */
  collections: CollectionRef[];
}

export interface SpinningNowResult {
  total: number;
  items: SpinningNowAlbum[];
}
