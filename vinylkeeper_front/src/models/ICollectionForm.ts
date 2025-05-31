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
}

export interface ICollection {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  user_id: number;
  registered_at: string;
  updated_at: string;
  owner: IUserInfo;
}

export interface ICollectionResponse {
  items: ICollection[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
