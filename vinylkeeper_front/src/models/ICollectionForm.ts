export interface ICollectionForm {
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
  album_ids?: number[];
  artist_ids?: number[];
  albums?: number[];
}

export interface ICollectionUpdateForm {
  name?: string;
  description?: string;
  is_public?: boolean;
  mood_id?: number;
}

