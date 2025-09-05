import { VinylStateEnum } from "@utils/GlobalUtils";

export interface IAlbumStateUpdate {
  state_record?: VinylStateEnum | null;
  state_cover?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
}

export interface IAlbumStateUpdateRequest {
  collection_id: number;
  album_id: number;
  data: IAlbumStateUpdate;
}
