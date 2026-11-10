import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";
import { isApiError } from "@utils/apiError";
import { capacitorHttpService } from "@utils/CapacitorHttpService";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { nativeSession } from "@utils/NativeSession";

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
  preferred_currency: "EUR" | "USD";
}

/** The tokens the API gives the Android app in the body: kept in the Keystore, never passed on. */
interface NativeTokensInBody {
  access_token?: string;
  refresh_token?: string;
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
  /** The Android app asks for its tokens in the body: it has no cookie to hold them. */
  private clientFields(): { client?: "native" } {
    return isCapacitorPlatform() ? { client: "native" } : {};
  }

  /** Puts the tokens of a native response in the Keystore and gives back the rest of it. */
  private async keepSession<T extends NativeTokensInBody>(
    response: T
  ): Promise<Omit<T, keyof NativeTokensInBody>> {
    const { access_token, refresh_token, ...rest } = response;
    if (isCapacitorPlatform() && access_token && refresh_token) {
      await nativeSession.save({ accessToken: access_token, refreshToken: refresh_token });
    }
    return rest;
  }

  async refreshToken(): Promise<{ isLoggedIn: boolean }> {
    if (isCapacitorPlatform()) {
      await capacitorHttpService.refreshSession();
      return { isLoggedIn: true };
    }
    return this.post<{ isLoggedIn: boolean }>("/users/refresh-token", undefined, true);
  }

  async logout(): Promise<void> {
    try {
      if (isCapacitorPlatform()) await capacitorHttpService.revokeSession();
      else await this.post("/users/logout");
    } finally {
      // Whatever the server answered, this device keeps no session
      if (isCapacitorPlatform()) await nativeSession.clear();
    }
  }

  async login(data: ILoginForm): Promise<LoginResponse> {
    try {
      const response = await this.post<LoginResponse & NativeTokensInBody>(
        "/users/auth",
        { email: data.email, password: data.password, ...this.clientFields() },
        true
      );
      return await this.keepSession(response);
    } catch (error: unknown) {
      throw new Error(loginErrorMessage(error), { cause: error });
    }
  }

  async register(data: IRegisterForm): Promise<RegisterResponse> {
    const response = await this.post<RegisterResponse & NativeTokensInBody>("/users/register", {
      username: data.username,
      email: data.email,
      password: data.password,
      is_accepted_terms: data.isAcceptedTerms,
      timezone: data.timezone,
      ...this.clientFields(),
    }, true);
    return this.keepSession(response);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      return await this.post<ForgotPasswordResponse>("/users/forgot-password", { email }, true);
    } catch (error: unknown) {
      throw new Error(
        isApiError(error) && error.code === TOO_MANY_REQUESTS
          ? "Too many requests. Wait a minute and try again."
          : "The link could not be sent. Try again in a moment.",
        { cause: error }
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
      throw new Error(isApiError(error) ? error.message : "Failed to confirm your email address.", { cause: error });
    }
  }

  async resendEmailConfirmation(): Promise<{ message: string }> {
    try {
      return await this.post<{ message: string }>("/users/me/confirm-email/resend");
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : "Failed to send the confirmation email.", { cause: error });
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
      throw new Error(isApiError(error) ? error.message : "Failed to change your email address.", { cause: error });
    }
  }

  /** Currency the collection value is shown in */
  async setCurrency(currency: "EUR" | "USD"): Promise<{ message: string }> {
    try {
      return await this.put<{ message: string }>("/users/me/currency", { currency });
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : "Failed to change the currency.", { cause: error });
    }
  }

  async changePassword(data: PasswordChangeData): Promise<{ message: string }> {
    try {
      // Every other session is revoked: the app receives the tokens of the new version
      const response = await this.put<{ message: string } & NativeTokensInBody>("/users/me/password", {
        current_password: data.currentPassword,
        new_password: data.newPassword,
      }, true);
      return await this.keepSession(response);
    } catch (error: unknown) {
      const message = isApiError(error) && error.code === 1000
        ? "Wrong current password."
        : isApiError(error) ? error.message : "Failed to change password. Please try again.";
      throw new Error(message, { cause: error });
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      await this.delete<void>("/users/me");
      if (isCapacitorPlatform()) await nativeSession.clear();
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
  setCurrency: (currency: "EUR" | "USD") => userApiServiceInstance.setCurrency(currency),
  deleteAccount: () => userApiServiceInstance.deleteAccount(),
  sendContactMessage: (data: ContactMessageData) => userApiServiceInstance.sendContactMessage(data),
};
