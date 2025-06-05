import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";

export interface UserMini {
  id: number;
  username: string;
  user_uuid: string;
}

export interface UserResponse {
  username: string;
  user_uuid: string;
  collections_count: number;
  liked_collections_count: number;
  loans_count: number;
  wishlist_items_count: number;
}

export interface UserSettingsResponse {
  username: string;
  email: string;
  user_uuid: string;
  created_at: string;
  terms_accepted_at?: string;
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
  async login(data: ILoginForm): Promise<LoginResponse> {
    try {
      const response = await this.post<LoginResponse>("/users/auth", {
        email: data.email,
        password: data.password,
      });
      return response;
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error("Failed to login. Please check your credentials.");
    }
  }

  async register(data: IRegisterForm): Promise<RegisterResponse> {
    try {
      return await this.post<RegisterResponse>("/users/register", {
        username: data.username,
        email: data.email,
        password: data.password,
        is_accepted_terms: data.isAcceptedTerms,
        timezone: data.timezone,
      });
    } catch (error) {
      console.error("Registration failed:", error);
      throw new Error("Failed to register. Please try again.");
    }
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      return await this.post<ForgotPasswordResponse>("/users/forgot-password", {
        email,
      });
    } catch (error) {
      console.error("Forgot password request failed:", error);
      throw new Error("Failed to process forgot password request.");
    }
  }

  async resetPassword(
    data: IResetPasswordToBackend
  ): Promise<ResetPasswordResponse> {
    try {
      return await this.post<ResetPasswordResponse>(
        "/users/reset-password",
        data
      );
    } catch (error) {
      console.error("Password reset failed:", error);
      throw new Error("Failed to reset password. Please try again.");
    }
  }

  async getCurrentUser(): Promise<UserResponse> {
    try {
      return await this.get<UserResponse>("/users/me");
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      throw new Error("Failed to fetch user information.");
    }
  }

  async getCurrentUserSettings(): Promise<UserSettingsResponse> {
    try {
      return await this.get<UserSettingsResponse>("/users/me/settings");
    } catch (error) {
      console.error("Failed to fetch current user settings:", error);
      throw new Error("Failed to fetch user settings information.");
    }
  }

  async updateProfile(data: ProfileUpdateData): Promise<{ message: string }> {
    try {
      return await this.put<{ message: string }>("/users/me", {
        username: data.username,
        email: data.email,
      });
    } catch (error) {
      console.error("Profile update failed:", error);
      throw new Error("Failed to update profile. Please try again.");
    }
  }

  async changePassword(data: PasswordChangeData): Promise<{ message: string }> {
    try {
      return await this.put<{ message: string }>("/users/me/password", {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
    } catch (error) {
      console.error("Password change failed:", error);
      throw new Error(
        "Failed to change password. Please check your current password."
      );
    }
  }

  async deleteAccount(): Promise<{ message: string }> {
    try {
      return await this.delete<{ message: string }>("/users/me");
    } catch (error) {
      console.error("Account deletion failed:", error);
      throw new Error("Failed to delete account. Please try again.");
    }
  }

  async sendContactMessage(
    data: ContactMessageData
  ): Promise<ContactMessageResponse> {
    try {
      return await this.post<ContactMessageResponse>("/users/contact", {
        subject: data.subject,
        message: data.message,
      });
    } catch (error) {
      console.error("Contact message failed:", error);
      throw new Error("Failed to send contact message. Please try again.");
    }
  }
}

const userApiServiceInstance = new UserApiService();

export const userApiService = {
  login: (data: ILoginForm) => userApiServiceInstance.login(data),
  register: (data: IRegisterForm) => userApiServiceInstance.register(data),
  forgotPassword: (email: string) =>
    userApiServiceInstance.forgotPassword(email),
  resetPassword: (data: IResetPasswordToBackend) =>
    userApiServiceInstance.resetPassword(data),
  getCurrentUser: () => userApiServiceInstance.getCurrentUser(),
  getCurrentUserSettings: () => userApiServiceInstance.getCurrentUserSettings(),
  updateProfile: (data: ProfileUpdateData) =>
    userApiServiceInstance.updateProfile(data),
  changePassword: (data: PasswordChangeData) =>
    userApiServiceInstance.changePassword(data),
  deleteAccount: () => userApiServiceInstance.deleteAccount(),
  sendContactMessage: (data: ContactMessageData) =>
    userApiServiceInstance.sendContactMessage(data),
};
