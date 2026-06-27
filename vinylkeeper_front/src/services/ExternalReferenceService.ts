import { logger } from "@utils/logger";
import {
  AddToWishlistRequest,
  AddToCollectionRequest,
  WishlistItemResponse,
  PaginatedWishlistResponse,
  CollectionItemResponse,
  AddToWishlistResponse,
  AddToCollectionResponse,
} from "@models/IExternalReference";
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
      throw new Error("Failed to add item to wishlist");
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
      throw new Error("Failed to add item to collection");
    }
  }

  async removeFromWishlist(wishlistId: number): Promise<void> {
    try {
      await this.delete<void>(
        `${this.endpoint}/wishlist/${wishlistId}`
      );
    } catch (error) {
      logger.error("Error removing from wishlist:", error);
      throw new Error("Failed to remove item from wishlist");
    }
  }

  async removeFromCollection(
    collectionId: number,
    externalId: string,
    entityType: "album" | "artist"
  ): Promise<void> {
    try {
      await this.delete<void>(
        `${this.endpoint}/collection/${collectionId}/remove?external_id=${externalId}&entity_type=${entityType}`
      );
    } catch (error) {
      logger.error("Error removing from collection:", error);
      throw new Error("Failed to remove item from collection");
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
      throw new Error("Failed to fetch wishlist items");
    }
  }

  async getWishlistItemDetail(
    wishlistId: number
  ): Promise<WishlistItemResponse> {
    try {
      return await this.get<WishlistItemResponse>(
        `${this.endpoint}/wishlist/${wishlistId}`
      );
    } catch (error) {
      logger.error("Error fetching wishlist item detail:", error);
      throw new Error("Failed to fetch wishlist item detail");
    }
  }

  async getCollectionItems(): Promise<CollectionItemResponse[]> {
    try {
      return await this.get<CollectionItemResponse[]>(
        `${this.endpoint}/collection`
      );
    } catch (error) {
      logger.error("Error fetching collection items:", error);
      throw new Error("Failed to fetch collection items");
    }
  }
}

const externalReferenceServiceInstance = new ExternalReferenceService();

export const externalReferenceApiService = {
  addToWishlist: (data: AddToWishlistRequest) =>
    externalReferenceServiceInstance.addToWishlist(data),
  addToCollection: (collectionId: number, data: AddToCollectionRequest) =>
    externalReferenceServiceInstance.addToCollection(collectionId, data),
  removeFromWishlist: (wishlistId: number) =>
    externalReferenceServiceInstance.removeFromWishlist(wishlistId),
  removeFromCollection: (
    collectionId: number,
    externalId: string,
    entityType: "album" | "artist"
  ) =>
    externalReferenceServiceInstance.removeFromCollection(
      collectionId,
      externalId,
      entityType
    ),
  getUserWishlistPaginated: (
    page: number = 1,
    limit: number = 8,
    userUuid?: string,
    sortOrder: string = "newest",
    search?: string
  ) =>
    externalReferenceServiceInstance.getUserWishlistPaginated(page, limit, userUuid, sortOrder, search),
  getWishlistItemDetail: (wishlistId: number) =>
    externalReferenceServiceInstance.getWishlistItemDetail(wishlistId),
  getCollectionItems: () =>
    externalReferenceServiceInstance.getCollectionItems(),
};
