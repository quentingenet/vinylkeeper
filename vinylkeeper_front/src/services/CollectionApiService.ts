import { BaseApiService } from "./BaseApiService";
import { PaginatedResponse } from "@models/BaseTypes";
import { ICollection, ICollectionForm } from "@models/ICollectionForm";
import { ITEMS_PER_PAGE } from "@utils/GlobalUtils";

export interface CollectionDetails {
  collection: ICollection;
  localAlbums: Array<{ id: number; title: string; artist: string }>;
  localArtists: Array<{ id: number; name: string }>;
  localGenres: Array<{ id: number; name: string }>;
  externalAlbums: Array<{
    id: number;
    externalId: string;
    title: string;
    artistName?: string;
    externalSource: string;
    itemType: string;
    pictureMedium?: string;
  }>;
  externalArtists: Array<{
    id: number;
    externalId: string;
    title: string;
    externalSource: string;
    itemType: string;
    pictureMedium?: string;
  }>;
}

export interface RemoveItemResponse {
  success: boolean;
  message: string;
}

export class CollectionApiService extends BaseApiService {
  async createCollection(data: ICollectionForm): Promise<ICollection> {
    return this.post<ICollection>("/collections/add", data);
  }

  async getCollections(
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE
  ): Promise<PaginatedResponse<ICollection>> {
    const endpoint = this.buildPaginatedEndpoint(
      "/collections",
      page,
      itemsPerPage
    );
    const backendResponse = await this.get<any>(endpoint);

    // Transform backend response (snake_case) to frontend format (camelCase)
    return {
      items: backendResponse.items || [],
      total: backendResponse.total || 0,
      page: backendResponse.page || 1,
      limit: backendResponse.limit || itemsPerPage,
      totalPages: backendResponse.total_pages || 0, // Convert snake_case to camelCase
    };
  }

  async getCollectionById(collectionId: number): Promise<ICollection> {
    return this.get<ICollection>(`/collections/${collectionId}`);
  }

  async getPublicCollections(
    page: number = 1,
    itemsPerPage: number = ITEMS_PER_PAGE
  ): Promise<PaginatedResponse<ICollection>> {
    const endpoint = this.buildPaginatedEndpoint(
      "/collections/public",
      page,
      itemsPerPage
    );
    const backendResponse = await this.get<any>(endpoint);

    // Transform backend response (snake_case) to frontend format (camelCase)
    return {
      items: backendResponse.items || [],
      total: backendResponse.total || 0,
      page: backendResponse.page || 1,
      limit: backendResponse.limit || itemsPerPage,
      totalPages: backendResponse.total_pages || 0, // Convert snake_case to camelCase
    };
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

  // REST-compliant endpoint (updated to match backend)
  async deleteCollection(collectionId: number): Promise<void> {
    return this.delete<void>(`/collections/${collectionId}`);
  }

  async removeAlbumFromCollection(
    collectionId: number,
    albumId: number
  ): Promise<RemoveItemResponse> {
    return this.delete<RemoveItemResponse>(
      `/collections/${collectionId}/albums/${albumId}`
    );
  }

  async removeArtistFromCollection(
    collectionId: number,
    artistId: number
  ): Promise<RemoveItemResponse> {
    return this.delete<RemoveItemResponse>(
      `/collections/${collectionId}/artists/${artistId}`
    );
  }

  async removeGenreFromCollection(
    collectionId: number,
    genreId: number
  ): Promise<RemoveItemResponse> {
    return this.delete<RemoveItemResponse>(
      `/collections/${collectionId}/genres/${genreId}`
    );
  }

  async removeExternalItemFromCollection(
    collectionId: number,
    externalReferenceId: number
  ): Promise<RemoveItemResponse> {
    return this.delete<RemoveItemResponse>(
      `/external/collection/${collectionId}/${externalReferenceId}`
    );
  }

  async getCollectionDetails(collectionId: number): Promise<CollectionDetails> {
    // Transform backend response to frontend format
    const backendResponse = await this.get<any>(
      `/collections/${collectionId}/details`
    );

    // Convert snake_case to camelCase
    return {
      collection: backendResponse.collection,
      localAlbums: backendResponse.local_albums || [],
      localArtists: backendResponse.local_artists || [],
      localGenres: backendResponse.local_genres || [],
      externalAlbums: (backendResponse.external_albums || []).map(
        (item: any) => ({
          id: item.id,
          externalId: item.external_id,
          title: item.title,
          artistName: item.artist_name,
          externalSource: item.external_source,
          itemType: item.item_type,
          pictureMedium: item.picture_medium,
        })
      ),
      externalArtists: (backendResponse.external_artists || []).map(
        (item: any) => ({
          id: item.id,
          externalId: item.external_id,
          title: item.title,
          externalSource: item.external_source,
          itemType: item.item_type,
          pictureMedium: item.picture_medium,
        })
      ),
    };
  }
}

// Export singleton instance
export const collectionApiService = new CollectionApiService();

// Export individual functions for backward compatibility
export const getCollections = (
  page: number = 1,
  itemsPerPage: number = ITEMS_PER_PAGE
) => collectionApiService.getCollections(page, itemsPerPage);

export const switchAreaCollection = (
  collectionId: number,
  newIsPublic: boolean
) => collectionApiService.switchCollectionVisibility(collectionId, newIsPublic);
