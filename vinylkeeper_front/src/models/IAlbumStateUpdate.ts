export interface IAlbumStateUpdate {
  state_record?: string | null;
  state_cover?: string | null;
  acquisition_month_year?: string | null;
}

export interface IAlbumStateUpdateRequest {
  collection_id: number;
  album_id: number;
  data: IAlbumStateUpdate;
}
