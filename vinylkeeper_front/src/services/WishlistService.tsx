import { BaseApiService } from "./BaseApiService";
import { WishlistItem } from "@models/IWishlist";
import { transformBackendArrayToWishlist } from "@utils/DataTransformers";

class WishlistApiService extends BaseApiService {
  async getWishlistItems(): Promise<WishlistItem[]> {
    const backendData = await this.get<any[]>("/external/wishlist");
    return transformBackendArrayToWishlist(backendData);
  }

  async removeFromWishlist(
    externalReferenceId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/external/wishlist/${externalReferenceId}`
    );
  }
}

const wishlistService = new WishlistApiService();

export const getWishlistItems = async (): Promise<WishlistItem[]> => {
  return wishlistService.getWishlistItems();
};

export const removeFromWishlist = async (
  externalReferenceId: number
): Promise<{ success: boolean; message: string }> => {
  return wishlistService.removeFromWishlist(externalReferenceId);
};
