import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
import { IWishlistItem } from "@models/IWishlist";

export const getWishlistItems = async (): Promise<IWishlistItem[]> => {
  return requestService<IWishlistItem[]>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: "/external/wishlist",
  });
};

export const removeFromWishlist = async (
  externalReferenceId: number
): Promise<{ success: boolean; message: string }> => {
  return requestService<{ success: boolean; message: string }>({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/external/wishlist/${externalReferenceId}`,
  });
};
