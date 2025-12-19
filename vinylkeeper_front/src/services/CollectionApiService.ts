import { BaseApiService } from "./BaseApiService";
import { ITEMS_PER_PAGE, VinylStateEnum } from "@utils/GlobalUtils";
import { WishlistItemResponse } from "@models/IExternalReference";

export interface UserMiniResponse {
  username: string;
  user_uuid: string;
}

export interface AlbumBase {
  external_album_id: string;
  title: string;
  image_url?: string;
  external_source: {
    id: number;
    name: string;
  };
}

export interface ArtistBase {
  external_artist_id: string;
  title: string;
  image_url?: string;
  external_source: {
    id: number;
    name: string;
  };
}

export interface AlbumInCollection {
  state_record?: VinylStateEnum | null;
  state_cover?: VinylStateEnum | null;
  acquisition_month_year?: string | null;
}

export interface CollectionAlbumResponse extends AlbumBase, AlbumInCollection {
  id: number;
  created_at: string;
  updated_at: string;
  collections_count: number;
  loans_count: number;
  wishlist_count: number;
}

export interface CollectionArtistResponse extends ArtistBase {
  id: number;
  created_at: string;
  updated_at: string;
  collections_count: number;
}

export interface CollectionBase {
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
}

export interface CollectionCreate extends CollectionBase {
  album_ids?: number[];
  artist_ids?: number[];
  albums?: number[];
}

export interface CollectionUpdate {
  name?: string;
  description?: string;
  is_public?: boolean;
  mood_id?: number;
}

export interface CollectionInDB extends CollectionBase {
  id: number;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionResponse {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  mood_id?: number;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: UserMiniResponse;
  albums: CollectionAlbumResponse[];
  artists: CollectionArtistResponse[];
  likes_count: number;
  is_liked_by_user: boolean;
  wishlist: WishlistItemResponse[];
}

export interface CollectionListItemResponse {
  id: number;
  name: string;
  description?: string;
  is_public: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: UserMiniResponse;
  likes_count: number;
  is_liked_by_user: boolean;
  albums_count: number;
  artists_count: number;
  image_preview?: string | null;
}

export interface CollectionDetailResponse {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  mood_id: number | null;
  owner_uuid: string;
  owner: UserMiniResponse | null;
  likes_count: number;
  is_liked_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface LikeStatusResponse {
  collection_id: number;
  liked: boolean;
  likes_count: number;
  last_liked_at?: string;
}

export interface PaginatedAlbumsResponse {
  items: CollectionAlbumResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedArtistsResponse {
  items: CollectionArtistResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CollectionSearchResponse {
  albums: CollectionAlbumResponse[];
  artists: CollectionArtistResponse[];
  query: string;
  search_type: string;
}

export interface PaginatedCollectionResponse {
  items: CollectionResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedCollectionListResponse {
  items: CollectionListItemResponse[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export class CollectionApiService extends BaseApiService {
  constructor() {
    super();
    // Bind methods to preserve 'this' context
    this.createCollection = this.createCollection.bind(this);
    this.getCollections = this.getCollections.bind(this);
    this.getCollectionById = this.getCollectionById.bind(this);
    this.getPublicCollections = this.getPublicCollections.bind(this);
    this.switchCollectionVisibility =
      this.switchCollectionVisibility.bind(this);
    this.updateCollection = this.updateCollection.bind(this);
    this.deleteCollection = this.deleteCollection.bind(this);
    this.removeAlbumFromCollection = this.removeAlbumFromCollection.bind(this);
    this.removeArtistFromCollection =
      this.removeArtistFromCollection.bind(this);
    this.getCollectionDetails = this.getCollectionDetails.bind(this);
    this.likeCollection = this.likeCollection.bind(this);
    this.unlikeCollection = this.unlikeCollection.bind(this);
  }

  async createCollection(
    data: CollectionCreate
  ): Promise<{ message: string; collection_id: number }> {
    return this.post<{ message: string; collection_id: number }>(
      "/collections/add",
      data
    );
  }

  async updateCollection(
    collectionId: number,
    data: CollectionUpdate
  ): Promise<{ message: string }> {
    return this.patch<{ message: string }>(
      `/collections/update/${collectionId}`,
      data
    );
  }

  async deleteCollection(collectionId: number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/collections/${collectionId}`);
  }

  async switchCollectionVisibility(
    collectionId: number,
    isPublic: boolean
  ): Promise<{ message: string }> {
    return this.patch<{ message: string }>(
      `/collections/area/${collectionId}`,
      { is_public: isPublic }
    );
  }

  async getCollectionById(collectionId: number): Promise<CollectionResponse> {
    return this.get<CollectionResponse>(`/collections/${collectionId}`);
  }

  async getCollectionDetails(
    collectionId: number
  ): Promise<CollectionDetailResponse> {
    const response = await this.get<CollectionDetailResponse>(
      `/collections/${collectionId}/details`
    );
    return response;
  }

  async likeCollection(collectionId: number): Promise<LikeStatusResponse> {
    return this.post<LikeStatusResponse>(`/collections/${collectionId}/like`);
  }

  async unlikeCollection(collectionId: number): Promise<LikeStatusResponse> {
    return this.delete<LikeStatusResponse>(`/collections/${collectionId}/like`);
  }

  async getCollections(
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE
  ): Promise<PaginatedCollectionListResponse> {
    return this.get<PaginatedCollectionListResponse>(
      this.buildPaginatedEndpoint("/collections", page, itemsPerPage)
    );
  }

  async getPublicCollections(
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE,
    sortBy: string = "updated_at"
  ): Promise<PaginatedCollectionListResponse> {
    return this.get<PaginatedCollectionListResponse>(
      `${this.buildPaginatedEndpoint(
        "/collections/public",
        page,
        itemsPerPage
      )}&sort_by=${sortBy}`
    );
  }

  async removeAlbumFromCollection(
    collectionId: number,
    albumId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/collections/${collectionId}/albums/${albumId}`
    );
  }

  async removeArtistFromCollection(
    collectionId: number,
    artistId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/collections/${collectionId}/artists/${artistId}`
    );
  }

  async getCollectionAlbumsPaginated(
    collectionId: number,
    page: number = 1,
    limit: number = 12
  ): Promise<PaginatedAlbumsResponse> {
    const response = await this.get<PaginatedAlbumsResponse>(
      `/collections/${collectionId}/albums?page=${page}&limit=${limit}`
    );
    return response;
  }

  async getCollectionArtistsPaginated(
    collectionId: number,
    page: number = 1,
    limit: number = 12
  ): Promise<PaginatedArtistsResponse> {
    return this.get<PaginatedArtistsResponse>(
      `/collections/${collectionId}/artists?page=${page}&limit=${limit}`
    );
  }

  async searchCollectionItems(
    collectionId: number,
    query: string,
    searchType: "album" | "artist" | "both" = "both"
  ): Promise<CollectionSearchResponse> {
    return this.get<CollectionSearchResponse>(
      `/collections/${collectionId}/search?q=${encodeURIComponent(
        query
      )}&search_type=${searchType}`
    );
  }

  async updateAlbumMetadata(
    collectionId: number,
    albumId: number,
    data: {
      state_record?: string | null;
      state_cover?: string | null;
      acquisition_month_year?: string | null;
    }
  ): Promise<{ success: boolean; message: string }> {
    return this.patch<{ success: boolean; message: string }>(
      `/collections/${collectionId}/albums/${albumId}/metadata`,
      data
    );
  }
}

const collectionApiServiceInstance = new CollectionApiService();

export const collectionApiService = {
  getCollectionDetails: (collectionId: number) =>
    collectionApiServiceInstance.getCollectionDetails(collectionId),
  createCollection: (data: CollectionCreate) =>
    collectionApiServiceInstance.createCollection(data),
  updateCollection: (collectionId: number, data: CollectionUpdate) =>
    collectionApiServiceInstance.updateCollection(collectionId, data),
  deleteCollection: (collectionId: number) =>
    collectionApiServiceInstance.deleteCollection(collectionId),
  likeCollection: (collectionId: number) =>
    collectionApiServiceInstance.likeCollection(collectionId),
  unlikeCollection: (collectionId: number) =>
    collectionApiServiceInstance.unlikeCollection(collectionId),
  getCollections: (page: number = 1, itemsPerPage: number = ITEMS_PER_PAGE) =>
    collectionApiServiceInstance.getCollections(page, itemsPerPage),
  getPublicCollections: (
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE,
    sortBy: string = "updated_at"
  ) =>
    collectionApiServiceInstance.getPublicCollections(
      page,
      itemsPerPage,
      sortBy
    ),
  getCollectionById: (collectionId: number) =>
    collectionApiServiceInstance.getCollectionById(collectionId),
  switchCollectionVisibility: (collectionId: number, isPublic: boolean) =>
    collectionApiServiceInstance.switchCollectionVisibility(
      collectionId,
      isPublic
    ),
  removeAlbumFromCollection: (collectionId: number, albumId: number) =>
    collectionApiServiceInstance.removeAlbumFromCollection(
      collectionId,
      albumId
    ),
  removeArtistFromCollection: (collectionId: number, artistId: number) =>
    collectionApiServiceInstance.removeArtistFromCollection(
      collectionId,
      artistId
    ),
  getCollectionAlbumsPaginated: (
    collectionId: number,
    page: number = 1,
    limit: number = 12
  ) =>
    collectionApiServiceInstance.getCollectionAlbumsPaginated(
      collectionId,
      page,
      limit
    ),
  getCollectionArtistsPaginated: (
    collectionId: number,
    page: number = 1,
    limit: number = 12
  ) =>
    collectionApiServiceInstance.getCollectionArtistsPaginated(
      collectionId,
      page,
      limit
    ),
  searchCollectionItems: (
    collectionId: number,
    query: string,
    searchType: "album" | "artist" | "both" = "both"
  ) =>
    collectionApiServiceInstance.searchCollectionItems(
      collectionId,
      query,
      searchType
    ),
  updateAlbumMetadata: (
    collectionId: number,
    albumId: number,
    data: {
      state_record?: string | null;
      state_cover?: string | null;
      acquisition_month_year?: string | null;
    }
  ) =>
    collectionApiServiceInstance.updateAlbumMetadata(
      collectionId,
      albumId,
      data
    ),
};

export default collectionApiService;
