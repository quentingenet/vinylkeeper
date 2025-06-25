export interface SearchQuery {
  query: string;
  is_artist: boolean;
}

export interface ExternalData {
  id: string;
  title: string;
  artist: string;
  year?: string;
  image_url?: string;
  source: string;
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

export interface IRequestToSend extends SearchQuery {}
export interface IArtistRequestResults extends DiscogsData {}
export interface IAlbumRequestResults extends DiscogsData {}
export interface IRequestResults {
  type: string;
  data: IArtistRequestResults[] | IAlbumRequestResults[];
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
