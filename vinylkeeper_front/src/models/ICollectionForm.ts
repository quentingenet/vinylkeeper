export interface ICollectionForm {
  name: string;
  description: string;
  is_public: boolean;
}

export interface ICollectionSwitchArea {
  collectionId: number;
  newIsPublic: boolean;
}

export interface ICollection {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
  user_id: number;
  registered_at: string;
  updated_at: string;
}

export interface ICollectionResponse {
  items: ICollection[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
