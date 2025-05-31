import { BaseApiService } from "./BaseApiService";

interface AddToWishlistRequest {
  external_id: string;
  title: string;
  artist_name?: string;
  picture_medium?: string;
}

interface AddToCollectionRequest {
  external_id: string;
  item_type: "album" | "artist";
  title: string;
  artist_name?: string;
  picture_medium?: string;
}

interface AddExternalResponse {
  success: boolean;
  message: string;
}

export class ExternalReferenceApiService extends BaseApiService {
  async addToWishlist(
    data: AddToWishlistRequest
  ): Promise<AddExternalResponse> {
    return this.post<AddExternalResponse>("/external/wishlist/add", data);
  }

  async addToCollection(
    collectionId: number,
    data: AddToCollectionRequest
  ): Promise<AddExternalResponse> {
    return this.post<AddExternalResponse>(
      `/external/collection/${collectionId}/add`,
      data
    );
  }
}

// Export singleton instance
export const externalReferenceApiService = new ExternalReferenceApiService();

// Backward compatibility exports
export const addToWishlist = async (
  data: AddToWishlistRequest
): Promise<AddExternalResponse> => {
  return externalReferenceApiService.addToWishlist(data);
};

export const addToCollection = async (
  collectionId: number,
  data: AddToCollectionRequest
): Promise<AddExternalResponse> => {
  return externalReferenceApiService.addToCollection(collectionId, data);
};
