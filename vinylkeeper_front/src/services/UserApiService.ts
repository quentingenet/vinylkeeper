import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";

export interface ICurrentUser {
  id: number;
  username: string;
  email: string;
  user_uuid: string;
}

export interface LoginResponse {
  isLoggedIn: boolean;
  status?: number;
  data?: any;
}

export interface RegisterResponse {
  message: string;
  isLoggedIn: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
  success: boolean;
}

export interface ResetPasswordResponse {
  message: string;
  success: boolean;
}

export class UserApiService extends BaseApiService {
  async login(data: ILoginForm): Promise<LoginResponse> {
    const requestDataLogin = {
      email: data.email,
      password: data.password,
    };

    const responseData = await this.post("/users/auth", requestDataLogin);

    if (!responseData) {
      throw new Error("Access token missing in response");
    }

    return {
      isLoggedIn: true,
      status: 200,
      data: responseData,
    };
  }

  async register(dataRegister: IRegisterForm): Promise<RegisterResponse> {
    const requestDataRegister = {
      username: dataRegister.username,
      email: dataRegister.email,
      password: dataRegister.password,
      is_accepted_terms: dataRegister.isAcceptedTerms,
      timezone: dataRegister.timezone,
    };

    return this.post<RegisterResponse>("/users/register", requestDataRegister);
  }

  async forgotPassword(emailRecovery: string): Promise<ForgotPasswordResponse> {
    return this.post<ForgotPasswordResponse>("/users/forgot-password", {
      email: emailRecovery,
    });
  }

  async resetPassword(
    dataReset: IResetPasswordToBackend
  ): Promise<ResetPasswordResponse> {
    return this.post<ResetPasswordResponse>("/users/reset-password", dataReset);
  }

  async getCurrentUser(): Promise<ICurrentUser> {
    return this.get<ICurrentUser>("/users/me");
  }
}

// Export singleton instance
export const userApiService = new UserApiService();
