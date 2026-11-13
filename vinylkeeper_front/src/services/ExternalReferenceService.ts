import { logger } from "@utils/logger";
import {
  AddToWishlistRequest,
  AddToCollectionRequest,
  PaginatedWishlistResponse,
  AddToWishlistResponse,
  AddToCollectionResponse,
  OwnedPressing,
  ReplacePressingRequest,
  MoveToCollectionResponse,
} from "@models/IExternalReference";
import type { CollectionAlbumResponse } from "@models/Collection";
import { BaseApiService } from "./BaseApiService";

export class ExternalReferenceService extends BaseApiService {
  private readonly endpoint = "/external-references";

  async addToWishlist(
    data: AddToWishlistRequest
  ): Promise<AddToWishlistResponse> {
    try {
      return await this.post<AddToWishlistResponse>(
        `${this.endpoint}/wishlist/add`,
        data
      );
    } catch (error) {
      logger.error("Error adding to wishlist:", error);
      throw new Error("Failed to add item to wishlist", { cause: error });
    }
  }

  async addToCollection(
    collectionId: number,
    data: AddToCollectionRequest
  ): Promise<AddToCollectionResponse> {
    try {
      return await this.post<AddToCollectionResponse>(
        `${this.endpoint}/collection/${collectionId}/add`,
        data
      );
    } catch (error) {
      logger.error("Error adding to collection:", error);
      throw new Error("Failed to add item to collection", { cause: error });
    }
  }

  async findOwnedPressings(externalId: string, masterId?: string | null): Promise<OwnedPressing[]> {
    const params = new URLSearchParams({ external_id: externalId });
    if (masterId) params.set("master_id", masterId);
    try {
      return await this.get<OwnedPressing[]>(`${this.endpoint}/collection/owned?${params.toString()}`);
    } catch (error) {
      logger.error("Error fetching owned pressings:", error);
      throw new Error("Failed to check your collections", { cause: error });
    }
  }

  async replacePressing(
    collectionId: number,
    albumId: number,
    data: ReplacePressingRequest
  ): Promise<CollectionAlbumResponse> {
    try {
      return await this.post<CollectionAlbumResponse>(
        `${this.endpoint}/collection/${collectionId}/albums/${albumId}/replace`,
        data
      );
    } catch (error) {
      logger.error("Error replacing pressing:", error);
      throw new Error("Failed to replace the pressing", { cause: error });
    }
  }

  /** A wanted record the user got: into one of their collections, out of the wishlist */
  async moveWishlistItemToCollection(
    wishlistId: number,
    collectionId: number,
    pressingConfirmed: boolean = true
  ): Promise<MoveToCollectionResponse> {
    return this.post<MoveToCollectionResponse>(`${this.endpoint}/wishlist/${wishlistId}/move-to-collection`, {
      collection_id: collectionId,
      pressing_confirmed: pressingConfirmed,
    });
  }

  async removeFromWishlist(wishlistId: number): Promise<void> {
    try {
      await this.delete<void>(
        `${this.endpoint}/wishlist/${wishlistId}`
      );
    } catch (error) {
      logger.error("Error removing from wishlist:", error);
      throw new Error("Failed to remove item from wishlist", { cause: error });
    }
  }

  async getUserWishlistPaginated(
    page: number = 1,
    limit: number = 8,
    userUuid?: string,
    sortOrder: string = "newest",
    search?: string
  ): Promise<PaginatedWishlistResponse> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort_order: sortOrder,
      });
      if (userUuid) params.set("user_uuid", userUuid);
      if (search?.trim()) params.set("search", search.trim());
      return await this.get<PaginatedWishlistResponse>(
        `${this.endpoint}/wishlist?${params.toString()}`
      );
    } catch (error) {
      logger.error("Error fetching paginated wishlist:", error);
      throw new Error("Failed to fetch wishlist items", { cause: error });
    }
  }
}

const externalReferenceServiceInstance = new ExternalReferenceService();

export const externalReferenceApiService = {
  addToWishlist: (data: AddToWishlistRequest) =>
    externalReferenceServiceInstance.addToWishlist(data),
  addToCollection: (collectionId: number, data: AddToCollectionRequest) =>
    externalReferenceServiceInstance.addToCollection(collectionId, data),
  findOwnedPressings: (externalId: string, masterId?: string | null) =>
    externalReferenceServiceInstance.findOwnedPressings(externalId, masterId),
  replacePressing: (collectionId: number, albumId: number, data: ReplacePressingRequest) =>
    externalReferenceServiceInstance.replacePressing(collectionId, albumId, data),
  moveWishlistItemToCollection: (wishlistId: number, collectionId: number, pressingConfirmed?: boolean) =>
    externalReferenceServiceInstance.moveWishlistItemToCollection(wishlistId, collectionId, pressingConfirmed),
  removeFromWishlist: (wishlistId: number) =>
    externalReferenceServiceInstance.removeFromWishlist(wishlistId),
  getUserWishlistPaginated: (
    page: number = 1,
    limit: number = 8,
    userUuid?: string,
    sortOrder: string = "newest",
    search?: string
  ) =>
    externalReferenceServiceInstance.getUserWishlistPaginated(page, limit, userUuid, sortOrder, search),
};
