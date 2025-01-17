import requestService from "@utils/RequestService";
import { API_VK_URL } from "@utils/GlobalUtils";
import { IRequestToSend } from "@models/IRequestPRoxy";

export const searchProxy = (requestToSend: IRequestToSend) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: `/request_proxy/search`,
    body: requestToSend,
  });
};
