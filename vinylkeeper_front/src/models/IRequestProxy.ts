export interface IRequestToSend {
  query: string;
  is_artist: boolean;
}

export interface Artist {
  uuid: string;
  id: number;
  name?: string;
  link?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  tracklist?: string;
  type?: string;
}

export interface DeezerData {
  uuid: string;
  id: number;
  name?: string; // Pour les artistes
  title?: string; // Pour les albums
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
}

export interface IArtistRequestResults {
  uuid: string;
  id: number;
  name?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_album?: number;
  nb_fan?: number;
  radio?: boolean;
  md5_image?: string;
  type?: string;
  source: string;
}

export interface IAlbumRequestResults {
  uuid: string;
  id: number;
  name?: string;
  artist?: Artist;
  cover_url?: string;
  title?: string;
  tracklist?: string;
  link?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  nb_album?: number;
  nb_fan?: number;
  radio?: boolean;
  md5_image?: string;
  genre_id?: number;
  nb_tracks?: number;
  record_type?: string;
  explicit_lyrics?: boolean;
  type?: string;
  source: string;
}

export interface IRequestResults {
  type: string;
  data: IArtistRequestResults[] | IAlbumRequestResults[];
}

export interface ArtistMetadata {
  name: string;
  biography?: string;
  image?: string;
  genres?: string[];
  country?: string;
  wikipedia_url?: string;
  discogs_id?: string;
  discogs_url?: string;
  members?: string[];
  active_years?: string;
  aliases?: string[];
}

export interface IRequestProxy {
  id: string;
  title: string;
  artist: string;
  year?: string;
  image_url?: string;
  external_url?: string;
  source: string;
}

export interface IRequestProxyResponse {
  items: IRequestProxy[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
