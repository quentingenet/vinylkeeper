import requestService from "@utils/RequestService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { API_VK_URL } from "@utils/GlobalUtils";
import { IResetPasswordToBackend } from "@models/IResetPassword";
import { encryptionService } from "../EncryptionService";

export const login = async (data: ILoginForm) => {
  try {
    const encryptedPassword = await encryptionService.encryptPassword(
      data.password
    );

    const requestDataLogin = {
      email: data.email,
      password: encryptedPassword,
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
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const register = async (dataRegister: IRegisterForm) => {
  try {
    const encryptedPassword = await encryptionService.encryptPassword(
      dataRegister.password
    );

    const requestDataRegister = {
      username: dataRegister.username,
      email: dataRegister.email,
      password: encryptedPassword,
      is_accepted_terms: dataRegister.isAcceptedTerms,
      timezone: dataRegister.timezone,
    };

    return requestService({
      apiTarget: API_VK_URL,
      method: "POST",
      endpoint: "/users/register",
      body: requestDataRegister,
    });
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
};

export const forgotPasswordService = (emailRecovery: string) => {
  return requestService({
    apiTarget: API_VK_URL,
    method: "POST",
    endpoint: "/users/forgot-password",
    body: { email: emailRecovery },
  });
};

export const resetPasswordService = async (
  dataReset: IResetPasswordToBackend
) => {
  try {
    const encryptedPassword = await encryptionService.encryptPassword(
      dataReset.new_password
    );

    const encryptedDataReset = {
      ...dataReset,
      new_password: encryptedPassword,
    };

    return requestService({
      apiTarget: API_VK_URL,
      method: "POST",
      endpoint: "/users/reset-password",
      body: encryptedDataReset,
    });
  } catch (error) {
    console.error("Password reset failed:", error);
    throw error;
  }
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
