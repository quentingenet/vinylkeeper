import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";

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

export const addToWishlist = async (
  data: AddToWishlistRequest
): Promise<AddExternalResponse> => {
  return requestService<AddExternalResponse>({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/external/wishlist/add",
    body: data,
  });
};

export const addToCollection = async (
  collectionId: number,
  data: AddToCollectionRequest
): Promise<AddExternalResponse> => {
  return requestService<AddExternalResponse>({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: `/external/collection/${collectionId}/add`,
    body: data,
  });
};
