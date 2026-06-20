import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";
import { isApiError } from "@utils/apiError";

export interface UserMini {
  id: number;
  username: string;
  user_uuid: string;
}

export interface UserResponse {
  username: string;
  user_uuid: string;
  is_tutorial_seen: boolean;
  is_admin: boolean;
  number_of_connections: number;
}

export interface UserSettingsResponse {
  username: string;
  email: string;
  user_uuid: string;
  created_at: string;
  is_accepted_terms: boolean;
}

export interface LoginResponse {
  isLoggedIn: boolean;
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

export interface ProfileUpdateData {
  username: string;
  email: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ContactMessageData {
  subject: string;
  message: string;
}

export interface ContactMessageResponse {
  message: string;
  sent_at: string;
}

export class UserApiService extends BaseApiService {
  async refreshToken(): Promise<{ isLoggedIn: boolean }> {
    return this.post<{ isLoggedIn: boolean }>("/users/refresh-token", undefined, true);
  }

  async logout(): Promise<void> {
    await this.post("/users/logout");
  }

  async login(data: ILoginForm): Promise<LoginResponse> {
    try {
      return await this.post<LoginResponse>("/users/auth", { email: data.email, password: data.password }, true);
    } catch {
      throw new Error("Failed to login. Please check your credentials.");
    }
  }

  async register(data: IRegisterForm): Promise<RegisterResponse> {
    return this.post<RegisterResponse>("/users/register", {
      username: data.username,
      email: data.email,
      password: data.password,
      is_accepted_terms: data.isAcceptedTerms,
      timezone: data.timezone,
    }, true);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      return await this.post<ForgotPasswordResponse>("/users/forgot-password", { email }, true);
    } catch {
      throw new Error("Failed to process forgot password request.");
    }
  }

  async resetPassword(data: IResetPasswordToBackend): Promise<ResetPasswordResponse> {
    try {
      return await this.post<ResetPasswordResponse>("/users/reset-password", data);
    } catch {
      throw new Error("Failed to reset password. Please try again.");
    }
  }

  async getCurrentUser(): Promise<UserResponse> {
    try {
      return await this.get<UserResponse>("/users/me");
    } catch {
      throw new Error("Failed to fetch user information.");
    }
  }

  async getCurrentUserSettings(): Promise<UserSettingsResponse> {
    try {
      return await this.get<UserSettingsResponse>("/users/me/settings");
    } catch {
      throw new Error("Failed to fetch user settings information.");
    }
  }

  async updateProfile(data: ProfileUpdateData): Promise<{ message: string }> {
    try {
      return await this.put<{ message: string }>("/users/me", { username: data.username, email: data.email });
    } catch {
      throw new Error("Failed to update profile. Please try again.");
    }
  }

  async changePassword(data: PasswordChangeData): Promise<{ message: string }> {
    try {
      return await this.put<{ message: string }>("/users/me/password", {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      }, true);
    } catch (error: unknown) {
      const message = isApiError(error) && error.code === 1000
        ? "Wrong current password."
        : isApiError(error) ? error.message : "Failed to change password. Please try again.";
      throw new Error(message);
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      return await this.delete<void>("/users/me");
    } catch {
      throw new Error("Failed to delete account. Please try again.");
    }
  }

  async sendContactMessage(data: ContactMessageData): Promise<ContactMessageResponse> {
    try {
      return await this.post<ContactMessageResponse>("/users/contact", {
        subject: data.subject,
        message: data.message,
      });
    } catch {
      throw new Error("Failed to send contact message. Please try again.");
    }
  }
}

const userApiServiceInstance = new UserApiService();

export const userApiService = {
  refreshToken: () => userApiServiceInstance.refreshToken(),
  logout: () => userApiServiceInstance.logout(),
  login: (data: ILoginForm) => userApiServiceInstance.login(data),
  register: (data: IRegisterForm) => userApiServiceInstance.register(data),
  forgotPassword: (email: string) => userApiServiceInstance.forgotPassword(email),
  resetPassword: (data: IResetPasswordToBackend) => userApiServiceInstance.resetPassword(data),
  getCurrentUser: () => userApiServiceInstance.getCurrentUser(),
  getCurrentUserSettings: () => userApiServiceInstance.getCurrentUserSettings(),
  updateProfile: (data: ProfileUpdateData) => userApiServiceInstance.updateProfile(data),
  changePassword: (data: PasswordChangeData) => userApiServiceInstance.changePassword(data),
  deleteAccount: () => userApiServiceInstance.deleteAccount(),
  sendContactMessage: (data: ContactMessageData) => userApiServiceInstance.sendContactMessage(data),
};
