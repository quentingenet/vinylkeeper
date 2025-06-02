import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";
import { encryptionService } from "./EncryptionService";

export interface ICurrentUser {
  id: number;
  username: string;
  email: string;
  user_uuid: string;
}

export interface LoginResponse {
  isLoggedIn: boolean;
  status: number;
  data: any;
}

export interface RegisterResponse {
  message: string;
  isLoggedIn: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export class UserApiService extends BaseApiService {
  async login(data: ILoginForm): Promise<LoginResponse> {
    try {
      const encryptedPassword = await encryptionService.encryptPassword(
        data.password
      );

      const requestDataLogin = {
        email: data.email,
        password: encryptedPassword,
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
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async register(dataRegister: IRegisterForm): Promise<RegisterResponse> {
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

      return this.post<RegisterResponse>(
        "/users/register",
        requestDataRegister
      );
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  }

  async forgotPassword(emailRecovery: string): Promise<ForgotPasswordResponse> {
    return this.post<ForgotPasswordResponse>("/users/forgot-password", {
      email: emailRecovery,
    });
  }

  async resetPassword(
    dataReset: IResetPasswordToBackend
  ): Promise<ResetPasswordResponse> {
    try {
      const encryptedPassword = await encryptionService.encryptPassword(
        dataReset.new_password
      );

      const encryptedDataReset = {
        ...dataReset,
        new_password: encryptedPassword,
      };

      return this.post<ResetPasswordResponse>(
        "/users/reset-password",
        encryptedDataReset
      );
    } catch (error) {
      console.error("Password reset failed:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<ICurrentUser> {
    return this.get<ICurrentUser>("/users/me");
  }
}

// Export singleton instance
export const userApiService = new UserApiService();
