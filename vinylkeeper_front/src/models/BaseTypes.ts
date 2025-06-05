export interface BaseEntity {
  id: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BaseItem extends BaseEntity {
  title: string;
  artistName?: string;
  pictureSmall?: string;
  pictureMedium?: string;
  pictureBig?: string;
}

export interface ExternalItem extends BaseItem {
  externalId: string;
  externalSource: string;
  itemType: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}
