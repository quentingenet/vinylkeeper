import { VinylStateEnum } from "@utils/GlobalUtils";

export interface ICollectionForm {
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
  album_ids?: number[];
  artist_ids?: number[];
  albums?: number[];
  state_record?: VinylStateEnum;
  state_cover?: VinylStateEnum;
  acquisition_month_year?: string;
}

export interface ICollectionUpdateForm {
  name?: string;
  description?: string;
  is_public?: boolean;
  mood_id?: number;
}

