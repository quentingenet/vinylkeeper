import {
  AddToWishlistRequest,
  AddToCollectionRequest,
} from "@models/IExternalReference";
import { BaseApiService } from "./BaseApiService";

class ExternalReferenceService extends BaseApiService {
  private readonly endpoint = "/external-references";

  async addToWishlist(data: AddToWishlistRequest) {
    return this.post(`${this.endpoint}/wishlist/add`, data);
  }

  async addToCollection(collectionId: number, data: AddToCollectionRequest) {
    return this.post(`${this.endpoint}/collection/${collectionId}/add`, data);
  }

  async removeFromWishlist(wishlistId: number) {
    return this.delete(`${this.endpoint}/wishlist/${wishlistId}`);
  }

  async removeFromCollection(collectionId: number) {
    return this.delete(`${this.endpoint}/collection/${collectionId}/remove`);
  }

  async getUserWishlist() {
    return this.get(`${this.endpoint}/wishlist`);
  }

  async getCollectionItems() {
    return this.get(`${this.endpoint}/collection`);
  }
}

export const externalReferenceApiService = new ExternalReferenceService();
