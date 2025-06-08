import { BaseApiService } from "./BaseApiService";
import { ICollection, ICollectionForm } from "@models/ICollectionForm";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";

interface PaginatedCollectionResponse {
  items: ICollection[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CollectionDetails {
  id: number;
  name: string;
  description: string;
  is_public: boolean;
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
    this.removeGenreFromCollection = this.removeGenreFromCollection.bind(this);
    this.removeExternalItemFromCollection =
      this.removeExternalItemFromCollection.bind(this);
    this.getCollectionDetails = this.getCollectionDetails.bind(this);
  }

  async createCollection(data: ICollectionForm): Promise<ICollection> {
    return this.post<ICollection>("/collections/add", data);
  }

  async getCollections(
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE
  ): Promise<PaginatedCollectionResponse> {
    return this.get<PaginatedCollectionResponse>(
      this.buildPaginatedEndpoint("/collections", page, itemsPerPage)
    );
  }

  async getCollectionById(collectionId: number): Promise<ICollection> {
    return this.get<ICollection>(`/collections/${collectionId}`);
  }

  async getPublicCollections(
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE
  ): Promise<PaginatedCollectionResponse> {
    return this.get<PaginatedCollectionResponse>(
      this.buildPaginatedEndpoint("/collections/public", page, itemsPerPage)
    );
  }

  async switchCollectionVisibility(
    collectionId: number,
    isPublic: boolean
  ): Promise<ICollection> {
    return this.patch<ICollection>(`/collections/area/${collectionId}`, {
      is_public: isPublic,
    });
  }

  async updateCollection(
    collectionId: number,
    data: ICollectionForm
  ): Promise<ICollection> {
    return this.patch<ICollection>(`/collections/update/${collectionId}`, data);
  }

  async deleteCollection(collectionId: number): Promise<void> {
    return this.delete<void>(`/collections/${collectionId}`);
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

  async removeGenreFromCollection(
    collectionId: number,
    genreId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/collections/${collectionId}/genres/${genreId}`
    );
  }

  async removeExternalItemFromCollection(
    collectionId: number,
    externalReferenceId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/collections/${collectionId}/remove/${externalReferenceId}`
    );
  }

  async getCollectionDetails(collectionId: number): Promise<CollectionDetails> {
    return this.get<CollectionDetails>(`/collections/${collectionId}/details`);
  }
}

// Export singleton instance
export const collectionApiService = new CollectionApiService();
