import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
import { IRequestToSend } from "@models/IRequestProxy";

export const searchProxy = (requestToSend: IRequestToSend) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: `/request-proxy/search`,
    body: requestToSend,
  });
};
