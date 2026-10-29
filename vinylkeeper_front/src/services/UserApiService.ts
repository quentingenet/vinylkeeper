import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";
import { isApiError } from "@utils/apiError";

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
  is_email_confirmed: boolean;
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

export interface EmailChangeData {
  newEmail: string;
  currentPassword: string;
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

// Error codes of the API (app/core/exceptions.py ErrorCode)
const INVALID_CREDENTIALS = 1000;
const ACCOUNT_LOCKED = 1003;
const TERMS_NOT_ACCEPTED = 1008;
const TOO_MANY_REQUESTS = 429;

/** What the user can do about a failed login, from the error of the API or of the network. */
export function loginErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return "Unable to reach Vinyl Keeper. Check your connection and try again.";
  }
  switch (error.code) {
    case INVALID_CREDENTIALS:
      return "Wrong email or password.";
    case ACCOUNT_LOCKED:
      return "This account is disabled. Contact us if you think it is a mistake.";
    case TERMS_NOT_ACCEPTED:
      return "This account has not accepted the terms of use. Contact us to restore access.";
    case TOO_MANY_REQUESTS:
      return "Too many login attempts. Wait a few minutes and try again.";
    default:
      return error.code >= 500 && error.code < 600
        ? "Vinyl Keeper is having trouble right now. Try again in a moment."
        : "Unable to reach Vinyl Keeper. Check your connection and try again.";
  }
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
    } catch (error: unknown) {
      throw new Error(loginErrorMessage(error));
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
    } catch (error: unknown) {
      throw new Error(
        isApiError(error) && error.code === TOO_MANY_REQUESTS
          ? "Too many requests. Wait a minute and try again."
          : "The link could not be sent. Try again in a moment."
      );
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

  /** Link of the registration or email change email: no session needed */
  async confirmEmail(token: string): Promise<{ message: string }> {
    try {
      return await this.post<{ message: string }>("/users/confirm-email", { token }, true);
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : "Failed to confirm your email address.");
    }
  }

  async resendEmailConfirmation(): Promise<{ message: string }> {
    try {
      return await this.post<{ message: string }>("/users/me/confirm-email/resend");
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : "Failed to send the confirmation email.");
    }
  }

  /** The email changes once the link sent to the new address is opened */
  async requestEmailChange(data: EmailChangeData): Promise<{ message: string }> {
    try {
      return await this.post<{ message: string }>("/users/me/email", {
        new_email: data.newEmail,
        current_password: data.currentPassword,
      });
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : "Failed to change your email address.");
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
  confirmEmail: (token: string) => userApiServiceInstance.confirmEmail(token),
  resendEmailConfirmation: () => userApiServiceInstance.resendEmailConfirmation(),
  requestEmailChange: (data: EmailChangeData) => userApiServiceInstance.requestEmailChange(data),
  changePassword: (data: PasswordChangeData) => userApiServiceInstance.changePassword(data),
  deleteAccount: () => userApiServiceInstance.deleteAccount(),
  sendContactMessage: (data: ContactMessageData) => userApiServiceInstance.sendContactMessage(data),
};
