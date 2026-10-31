export interface SearchQuery {
  query: string;
  is_artist: boolean;
  page?: number;
}

export interface SearchResultsPage {
  items: DiscogsData[];
  page: number;
  total_pages: number;
}

export interface Artist {
  uuid: string;
  id: string;
  title?: string;
  link?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  tracklist?: string;
  type?: string;
}

export interface DiscogsData {
  uuid: string;
  id: string;
  name?: string;
  title?: string;
  link?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_album?: number;
  nb_fan?: number;
  radio?: boolean;
  tracklist?: string;
  md5_image?: string;
  genre_id?: number;
  nb_tracks?: number;
  record_type?: string;
  explicit_lyrics?: boolean;
  artist?: Artist;
  type?: string;
  // Edition of a release (albums only)
  year?: string | null;
  country?: string | null;
  label?: string | null;
  catno?: string | null;
  formats?: string[];
  master_id?: string | null;
}

export interface Track {
  position: string;
  title: string;
  duration: string;
}

export interface AlbumMetadata {
  id: string;
  title: string;
  artist: string;
  year?: string;
  image_url?: string;
  genres: string[];
  styles: string[];
  tracklist: Track[];
  source: string;
  country?: string | null;
  label?: string | null;
  catno?: string | null;
  formats?: string[];
  // Printed or etched on the record, shown on demand to identify the pressing
  barcode?: string | null;
  matrix?: string[];
  released?: string | null;
}

export interface ArtistMetadata {
  id: string;
  title: string;
  image_url?: string;
  biography?: string;
  genres: string[];
  country?: string;
  wikipedia_url?: string;
  external_id?: string;
  external_url?: string;
  members: string[];
  active_years?: string;
  aliases: string[];
  source: string;
}

export type IRequestToSend = SearchQuery;
export type IArtistRequestResults = DiscogsData;
export type IAlbumRequestResults = DiscogsData;

