import requestService from "@utils/RequestService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { API_VK_URL } from "@utils/GlobalUtils";
import { IResetPassword } from "@models/IResetPassword";
import { IResetPasswordToBackend } from "@models/IResetPasswordToBackend";

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
    credentials: "include",
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
    credentials: "include",
  });
};

export const forgotPasswordService = (emailRecovery: string) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/forgot-password",
    body: { email: emailRecovery },
    credentials: "include",
  });
};

export const resetPasswordService = (dataReset: IResetPasswordToBackend) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/reset-password",
    body: dataReset,
    credentials: "include",
  });
};
