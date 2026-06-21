import { BaseApiService } from "./BaseApiService";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import type {
  UserMiniResponse,
  AlbumBase,
  ArtistBase,
  AlbumInCollection,
  CollectionAlbumResponse,
  CollectionArtistResponse,
  CollectionBase,
  CollectionCreate,
  CollectionUpdate,
  CollectionInDB,
  CollectionResponse,
  CollectionListItemResponse,
  CollectionDetailResponse,
  LikeStatusResponse,
  CollectionSearchResponse,
  PaginatedAlbumsResponse,
  PaginatedArtistsResponse,
  PaginatedCollectionResponse,
  PaginatedCollectionListResponse,
} from "@models/Collection";

export type {
  UserMiniResponse,
  AlbumBase,
  ArtistBase,
  AlbumInCollection,
  CollectionAlbumResponse,
  CollectionArtistResponse,
  CollectionBase,
  CollectionCreate,
  CollectionUpdate,
  CollectionInDB,
  CollectionResponse,
  CollectionListItemResponse,
  CollectionDetailResponse,
  LikeStatusResponse,
  CollectionSearchResponse,
  PaginatedAlbumsResponse,
  PaginatedArtistsResponse,
  PaginatedCollectionResponse,
  PaginatedCollectionListResponse,
};

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
  ): Promise<void> {
    return this.delete<void>(`/collections/${collectionId}/albums/${albumId}`);
  }

  async removeArtistFromCollection(
    collectionId: number,
    artistId: number
  ): Promise<void> {
    return this.delete<void>(`/collections/${collectionId}/artists/${artistId}`);
  }

  async getCollectionAlbumsPaginated(
    collectionId: number,
    page: number = 1,
    limit: number = 12,
    sortOrder: "newest" | "oldest" = "newest"
  ): Promise<PaginatedAlbumsResponse> {
    const response = await this.get<PaginatedAlbumsResponse>(
      `/collections/${collectionId}/albums?page=${page}&limit=${limit}&sort_order=${sortOrder}`
    );
    return response;
  }

  async getCollectionArtistsPaginated(
    collectionId: number,
    page: number = 1,
    limit: number = 12,
    sortOrder: "newest" | "oldest" = "newest"
  ): Promise<PaginatedArtistsResponse> {
    return this.get<PaginatedArtistsResponse>(
      `/collections/${collectionId}/artists?page=${page}&limit=${limit}&sort_order=${sortOrder}`
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
  ): Promise<CollectionAlbumResponse> {
    return this.patch<CollectionAlbumResponse>(
      `/collections/${collectionId}/albums/${albumId}/metadata`,
      data
    );
  }

  async exportCollectionFile(
    collectionId: number,
    pathSuffix: string
  ): Promise<{ blob: Blob; filename: string }> {
    return this.blobGet(`/collections/${collectionId}/export/${pathSuffix}`);
  }

  async exportMyWishlistFile(
    format: "csv" | "ods"
  ): Promise<{ blob: Blob; filename: string }> {
    return this.blobGet(`/external-references/wishlist/export/${format}`);
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
    limit: number = 12,
    sortOrder: "newest" | "oldest" = "newest"
  ) =>
    collectionApiServiceInstance.getCollectionAlbumsPaginated(
      collectionId,
      page,
      limit,
      sortOrder
    ),
  getCollectionArtistsPaginated: (
    collectionId: number,
    page: number = 1,
    limit: number = 12,
    sortOrder: "newest" | "oldest" = "newest"
  ) =>
    collectionApiServiceInstance.getCollectionArtistsPaginated(
      collectionId,
      page,
      limit,
      sortOrder
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
  ): Promise<CollectionAlbumResponse> =>
    collectionApiServiceInstance.updateAlbumMetadata(
      collectionId,
      albumId,
      data
    ),
  exportCollectionFile: (collectionId: number, pathSuffix: string) =>
    collectionApiServiceInstance.exportCollectionFile(collectionId, pathSuffix),
  exportMyWishlistFile: (format: "csv" | "ods") =>
    collectionApiServiceInstance.exportMyWishlistFile(format),
};

export default collectionApiService;
