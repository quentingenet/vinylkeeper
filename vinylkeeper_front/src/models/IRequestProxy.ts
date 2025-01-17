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
  artist?: string;
  album?: string;
  cover_url?: string;
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
  type?: string;
}

export interface IAlbumRequestResults {
  uuid: string;
  id: number;
  name?: string;
  artist?: string;
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
}

export interface IRequestResults {
  type: string;
  data: IArtistRequestResults[] | IAlbumRequestResults[];
}
