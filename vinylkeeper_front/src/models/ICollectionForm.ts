export interface ICollectionForm {
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
  album_ids?: number[];
  artist_ids?: number[];
  albums?: number[];
  state_record?: string;
  state_cover?: string;
  acquisition_month_year?: string;
}

export interface ICollectionUpdateForm {
  name?: string;
  description?: string;
  is_public?: boolean;
  mood_id?: number;
}

export interface ICollectionSwitchArea {
  collectionId: number;
  newIsPublic: boolean;
}

export interface IUserInfo {
  id: number;
  username: string;
  user_uuid: string;
}

export interface IAlbumInCollection {
  id: number;
  title: string;
  artist: string;
  year?: string;
  image_url?: string;
  state_record?: number;
  state_cover?: number;
  acquisition_date?: string;
  created_at: string;
  updated_at: string;
  collections_count: number;
  loans_count: number;
  wishlist_count: number;
}

export interface IArtistInCollection {
  id: number;
  title: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  collections_count: number;
}

export interface ICollection {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner: IUserInfo;
  albums: IAlbumInCollection[];
  artists: IArtistInCollection[];
  likes_count: number;
  is_liked_by_user: boolean;
}

export interface ICollectionDetails extends ICollection {
  liked_by: IUserInfo[];
}

export interface ICollectionResponse {
  items: ICollection[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface BackendResponse<T> {
  data: {
    data: T;
    message?: string;
    status: string;
  };
}
