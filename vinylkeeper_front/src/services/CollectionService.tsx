import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
import { ICollectionForm } from "@models/ICollectionForm";

export const createCollection = (data: ICollectionForm) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/collections/add",
    body: data,
  });
};

export const getCollections = () => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: "/collections/",
  });
};

export const switchAreaCollection = (
  collectionId: number,
  isPublic: boolean
) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "PATCH",
    endpoint: `/collections/area/${collectionId}`,
    body: { is_public: isPublic },
  });
};

export const updateCollection = (
  collectionId: number,
  data: ICollectionForm
) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "PATCH",
    endpoint: `/collections/update/${collectionId}`,
    body: data,
  });
};

export const deleteCollection = (collectionId: number) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "DELETE",
    endpoint: `/collections/delete/${collectionId}`,
  });
};
