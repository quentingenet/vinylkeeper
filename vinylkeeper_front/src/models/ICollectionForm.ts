export interface ICollectionForm {
  name: string;
  description: string;
  is_public: boolean;
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

export interface ICollection {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  mood: string | null;
  owner_id: number;
  registered_at: string;
  updated_at: string;
  owner: {
    id: number;
    username: string;
    user_uuid: string;
  };
  albums: any[];
  artists: any[];
  likes_count: number;
  is_liked_by_user: boolean;
}

export interface ICollectionDetails extends ICollection {
  liked_by: Array<{
    id: number;
    username: string;
    user_uuid: string;
  }>;
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
