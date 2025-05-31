import { WishlistItem } from "@models/IWishlist";

export const transformBackendToWishlistItem = (
  backendItem: any
): WishlistItem => {
  return {
    id: backendItem.id,
    externalId: backendItem.external_id,
    title: backendItem.title,
    artistName: backendItem.artist_name,
    pictureMedium: backendItem.picture_medium,
    pictureSmall: backendItem.picture_small,
    pictureBig: backendItem.picture_big,
    externalSource: backendItem.external_source,
    itemType: backendItem.item_type,
    createdAt: backendItem.created_at,
  };
};

export const transformWishlistItemToBackend = (frontendItem: WishlistItem) => {
  return {
    id: frontendItem.id,
    external_id: frontendItem.externalId,
    title: frontendItem.title,
    artist_name: frontendItem.artistName,
    picture_medium: frontendItem.pictureMedium,
    picture_small: frontendItem.pictureSmall,
    picture_big: frontendItem.pictureBig,
    external_source: frontendItem.externalSource,
    item_type: frontendItem.itemType,
    created_at: frontendItem.createdAt,
  };
};

export const transformBackendArrayToWishlist = (
  backendArray: any[]
): WishlistItem[] => {
  return backendArray.map(transformBackendToWishlistItem);
};
