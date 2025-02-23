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
