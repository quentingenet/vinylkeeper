import { WishlistItem } from "@models/IWishlist";

export const transformBackendToWishlistItem = (
  backendItem: any
): WishlistItem => {
  return {
    id: backendItem.id,
    user_id: backendItem.user_id,
    external_id: backendItem.external_id,
    entity_type: backendItem.entity_type,
    title: backendItem.title,
    image_url: backendItem.image_url,
    source: backendItem.source,
    created_at: backendItem.created_at,
    album: backendItem.album,
    artist: backendItem.artist,
    user: backendItem.user,
  };
};

export const transformWishlistItemToBackend = (frontendItem: WishlistItem) => {
  return {
    id: frontendItem.id,
    user_id: frontendItem.user_id,
    external_id: frontendItem.external_id,
    entity_type: frontendItem.entity_type,
    title: frontendItem.title,
    picture: frontendItem.image_url,
    source: frontendItem.source,
    created_at: frontendItem.created_at,
    album: frontendItem.album,
    artist: frontendItem.artist,
    user: frontendItem.user,
  };
};

export const transformBackendArrayToWishlist = (
  backendArray: any[]
): WishlistItem[] => {
  return backendArray.map(transformBackendToWishlistItem);
};
