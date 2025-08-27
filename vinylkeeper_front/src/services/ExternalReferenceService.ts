import {
  AddToWishlistRequest,
  AddToCollectionRequest,
  WishlistItemResponse,
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
      console.error("Error adding to wishlist:", error);
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
      console.error("Error adding to collection:", error);
      throw new Error("Failed to add item to collection");
    }
  }

  async removeFromWishlist(wishlistId: number): Promise<boolean> {
    try {
      return await this.delete<boolean>(
        `${this.endpoint}/wishlist/${wishlistId}`
      );
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      throw new Error("Failed to remove item from wishlist");
    }
  }

  async removeFromCollection(
    collectionId: number,
    externalId: string,
    entityType: "album" | "artist"
  ): Promise<boolean> {
    try {
      return await this.delete<boolean>(
        `${this.endpoint}/collection/${collectionId}/remove?external_id=${externalId}&entity_type=${entityType}`
      );
    } catch (error) {
      console.error("Error removing from collection:", error);
      throw new Error("Failed to remove item from collection");
    }
  }

  async getUserWishlist(): Promise<WishlistItemResponse[]> {
    try {
      return await this.get<WishlistItemResponse[]>(
        `${this.endpoint}/wishlist`
      );
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      throw new Error("Failed to fetch wishlist items");
    }
  }

  async getCollectionItems(): Promise<CollectionItemResponse[]> {
    try {
      return await this.get<CollectionItemResponse[]>(
        `${this.endpoint}/collection`
      );
    } catch (error) {
      console.error("Error fetching collection items:", error);
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
  getUserWishlist: () => externalReferenceServiceInstance.getUserWishlist(),
  getCollectionItems: () =>
    externalReferenceServiceInstance.getCollectionItems(),
};
