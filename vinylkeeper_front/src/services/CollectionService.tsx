import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
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

export const getCollections = async (): Promise<ICollection[]> => {
  return requestService<ICollection[]>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: "/collections/",
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
