import requestService from "@utils/RequestService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { API_VK_URL } from "@utils/GlobalUtils";
import { IResetPasswordToBackend } from "@models/IResetPassword";

export const login = (data: ILoginForm) => {
  const requestDataLogin = {
    email: data.email,
    password: data.password,
  };

  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/auth",
    body: requestDataLogin,
  }).then((responseData) => {
    if (!responseData) {
      throw new Error("Access token missing in response");
    }
    return { status: 200, data: responseData };
  });
};

export const register = (dataRegister: IRegisterForm) => {
  const requestDataRegister = {
    username: dataRegister.username,
    email: dataRegister.email,
    password: dataRegister.password,
    is_accepted_terms: dataRegister.isAcceptedTerms,
    timezone: dataRegister.timezone,
  };

  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/register",
    body: requestDataRegister,
  });
};

export const forgotPasswordService = (emailRecovery: string) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/forgot-password",
    body: { email: emailRecovery },
  });
};

export const resetPasswordService = (dataReset: IResetPasswordToBackend) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/reset-password",
    body: dataReset,
  });
};

export interface ICurrentUser {
  id: number;
  username: string;
  email: string;
  user_uuid: string;
}

export const getCurrentUser = async (): Promise<ICurrentUser> => {
  return requestService<ICurrentUser>({
    apiTarget: API_VK_URL,
    method: "GET",
    endpoint: "/users/me",
  });
};
