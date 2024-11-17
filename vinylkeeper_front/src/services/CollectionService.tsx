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
    endpoint: "/collections/get",
  });
};
