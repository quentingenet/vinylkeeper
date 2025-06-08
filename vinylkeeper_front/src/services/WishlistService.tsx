import { BaseApiService } from "./BaseApiService";
import { WishlistItem } from "@models/IWishlist";
import { transformBackendToWishlistItem } from "@utils/DataTransformers";

export class WishlistApiService extends BaseApiService {
  async getWishlistItems(): Promise<WishlistItem[]> {
    const backendData = await this.get<any[]>("/external-references/wishlist");
    return backendData.map(transformBackendToWishlistItem);
  }

  async removeFromWishlist(
    externalReferenceId: number
  ): Promise<{ success: boolean; message: string }> {
    return this.delete<{ success: boolean; message: string }>(
      `/external-references/wishlist/${externalReferenceId}`
    );
  }
}

// Export singleton instance
export const wishlistApiService = new WishlistApiService();

// Backward compatibility exports
export const getWishlistItems = async (): Promise<WishlistItem[]> => {
  return wishlistApiService.getWishlistItems();
};

export const removeFromWishlist = async (
  externalReferenceId: number
): Promise<{ success: boolean; message: string }> => {
  return wishlistApiService.removeFromWishlist(externalReferenceId);
};
