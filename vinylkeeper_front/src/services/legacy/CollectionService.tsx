import requestService from "@utils/RequestService";
import { API_VK_URL, ITEMS_PER_PAGE } from "@utils/GlobalUtils";
import { ICollection, ICollectionForm } from "@models/ICollectionForm";

export const createCollection = async (
  data: ICollectionForm
): Promise<ICollection> => {
  return requestService<ICollection>({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/collections/add",
    body: data,
  });
};

interface PaginatedCollectionResponse {
  items: ICollection[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export const getCollections = async (
  page: number = 1,
  itemsPerPage: number = ITEMS_PER_PAGE
): Promise<PaginatedCollectionResponse> => {
  return requestService<PaginatedCollectionResponse>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: `/collections?page=${page}&limit=${itemsPerPage}`,
  });
};

export const getCollectionById = async (
  collectionId: number
): Promise<ICollection> => {
  return requestService<ICollection>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: `/collections/${collectionId}`,
  });
};

export const getPublicCollections = async (
  page: number = 1,
  itemsPerPage: number = ITEMS_PER_PAGE
): Promise<PaginatedCollectionResponse> => {
  return requestService<PaginatedCollectionResponse>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: `/collections/public?page=${page}&limit=${itemsPerPage}`,
  });
};

export const switchAreaCollection = async (
  collectionId: number,
  isPublic: boolean
): Promise<ICollection> => {
  return requestService<ICollection>({
    apiTarget: API_VK_URL,
    method: "PATCH",
    endpoint: `/collections/area/${collectionId}`,
    body: { is_public: isPublic },
  });
};

export const updateCollection = async (
  collectionId: number,
  data: ICollectionForm
): Promise<ICollection> => {
  return requestService<ICollection>({
    apiTarget: API_VK_URL,
    method: "PATCH",
    endpoint: `/collections/update/${collectionId}`,
    body: data,
  });
};

export const deleteCollection = async (collectionId: number): Promise<void> => {
  return requestService<void>({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/collections/delete/${collectionId}`,
  });
};

export const removeAlbumFromCollection = async (
  collectionId: number,
  albumId: number
): Promise<{ success: boolean; message: string }> => {
  return requestService<{ success: boolean; message: string }>({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/collections/${collectionId}/albums/${albumId}`,
  });
};

export const removeArtistFromCollection = async (
  collectionId: number,
  artistId: number
): Promise<{ success: boolean; message: string }> => {
  return requestService<{ success: boolean; message: string }>({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/collections/${collectionId}/artists/${artistId}`,
  });
};

export const removeGenreFromCollection = async (
  collectionId: number,
  genreId: number
): Promise<{ success: boolean; message: string }> => {
  return requestService<{ success: boolean; message: string }>({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/collections/${collectionId}/genres/${genreId}`,
  });
};

export const removeExternalItemFromCollection = async (
  collectionId: number,
  externalReferenceId: number
): Promise<{ success: boolean; message: string }> => {
  return requestService<{ success: boolean; message: string }>({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/external/collection/${collectionId}/${externalReferenceId}`,
  });
};

interface CollectionDetails {
  collection: ICollection;
  local_albums: Array<{ id: number; title: string; artist: string }>;
  local_artists: Array<{ id: number; name: string }>;
  local_genres: Array<{ id: number; name: string }>;
  external_albums: Array<{
    id: number;
    external_id: string;
    title: string;
    artist_name?: string;
    external_source: string;
    item_type: string;
    picture_medium?: string;
  }>;
  external_artists: Array<{
    id: number;
    external_id: string;
    title: string;
    external_source: string;
    item_type: string;
    picture_medium?: string;
  }>;
}

export const getCollectionDetails = async (
  collectionId: number
): Promise<CollectionDetails> => {
  return requestService<CollectionDetails>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: `/collections/${collectionId}/details`,
  });
};
