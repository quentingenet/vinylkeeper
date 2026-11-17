import { BaseApiService } from "./BaseApiService";
import { ILoginForm } from "@models/ILoginForm";
import { IRegisterForm } from "@models/IRegisterForm";
import { IResetPasswordToBackend } from "@models/IResetPassword";
import { ApiErrorCode, isApiError } from "@utils/apiError";
import { RESET_LINK_UNUSABLE } from "@utils/resetLink";
import { capacitorHttpService } from "@utils/CapacitorHttpService";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { nativeSession } from "@utils/NativeSession";
import i18n, { type LanguagePreference } from "@utils/i18n";

export interface UserResponse {
  username: string;
  user_uuid: string;
  is_tutorial_seen: boolean;
  is_admin: boolean;
  number_of_connections: number;
  /** Language of the interface the member picked; null follows the device */
  language: LanguagePreference;
}

export interface UserSettingsResponse {
  username: string;
  email: string;
  user_uuid: string;
  created_at: string;
  is_accepted_terms: boolean;
  is_email_confirmed: boolean;
  preferred_currency: "EUR" | "USD";
  language: LanguagePreference;
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

// HTTP status of the rate limit (NGINX): not a code of the API
const TOO_MANY_REQUESTS = 429;

/** What the user can do about a failed login, from the error of the API or of the network. */
export function loginErrorMessage(error: unknown): string {
  if (!isApiError(error)) {
    return i18n.t("auth:login.errors.unreachable");
  }
  switch (error.code) {
    case ApiErrorCode.INVALID_CREDENTIALS:
      return i18n.t("auth:login.errors.wrongCredentials");
    case ApiErrorCode.ACCOUNT_LOCKED:
      return i18n.t("auth:login.errors.locked");
    case ApiErrorCode.TERMS_NOT_ACCEPTED:
      return i18n.t("auth:login.errors.termsNotAccepted");
    case TOO_MANY_REQUESTS:
      return i18n.t("auth:login.errors.tooMany");
    default:
      return error.code >= 500 && error.code < 600
        ? i18n.t("auth:login.errors.server")
        : i18n.t("auth:login.errors.unreachable");
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
          ? i18n.t("auth:forgot.tooMany")
          : i18n.t("auth:forgot.error"),
        { cause: error }
      );
    }
  }

  async resetPassword(data: IResetPasswordToBackend): Promise<ResetPasswordResponse> {
    try {
      // Opened from an email, without a session: a refresh of the session has nothing to refresh
      return await this.post<ResetPasswordResponse>("/users/reset-password", data, true);
    } catch (error) {
      throw new Error(isApiError(error) && error.code === ApiErrorCode.INVALID_TOKEN
        ? RESET_LINK_UNUSABLE
        : i18n.t("auth:reset.failed"), { cause: error });
    }
  }

  /** Whether the link of a reset email still works; resolves when it does, rejects (with the reason) when not */
  async checkResetToken(token: string): Promise<void> {
    try {
      await this.post<ResetPasswordResponse>("/users/reset-password/check", { token }, true);
    } catch (error) {
      throw new Error(isApiError(error) && error.code === ApiErrorCode.INVALID_TOKEN
        ? RESET_LINK_UNUSABLE
        : i18n.t("auth:reset.checkFailed"), { cause: error });
    }
  }

  async getCurrentUser(): Promise<UserResponse> {
    try {
      return await this.get<UserResponse>("/users/me");
    } catch {
      throw new Error(i18n.t("auth:errors.fetchUser"));
    }
  }

  async getCurrentUserSettings(): Promise<UserSettingsResponse> {
    try {
      return await this.get<UserSettingsResponse>("/users/me/settings");
    } catch {
      throw new Error(i18n.t("auth:errors.fetchSettings"));
    }
  }

  /** Link of the registration or email change email: no session needed */
  async confirmEmail(token: string): Promise<{ message: string }> {
    try {
      return await this.post<{ message: string }>("/users/confirm-email", { token }, true);
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : i18n.t("auth:errors.confirmEmail"), { cause: error });
    }
  }

  async resendEmailConfirmation(): Promise<{ message: string }> {
    try {
      return await this.post<{ message: string }>("/users/me/confirm-email/resend");
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : i18n.t("auth:errors.resendConfirmation"), { cause: error });
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
      throw new Error(isApiError(error) ? error.message : i18n.t("auth:errors.changeEmail"), { cause: error });
    }
  }

  /** Currency the collection value is shown in */
  async setCurrency(currency: "EUR" | "USD"): Promise<{ message: string }> {
    try {
      return await this.put<{ message: string }>("/users/me/currency", { currency });
    } catch (error: unknown) {
      throw new Error(isApiError(error) ? error.message : i18n.t("auth:errors.changeCurrency"), { cause: error });
    }
  }

  /** Language of the interface of the current member; null follows the device */
  async setLanguage(language: LanguagePreference): Promise<{ message: string }> {
    return this.put<{ message: string }>("/users/me/language", { language });
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
      const message = isApiError(error) && error.code === ApiErrorCode.INVALID_CREDENTIALS
        ? i18n.t("auth:errors.wrongCurrentPassword")
        : isApiError(error) ? error.message : i18n.t("auth:errors.changePassword");
      throw new Error(message, { cause: error });
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      await this.delete<void>("/users/me");
      if (isCapacitorPlatform()) await nativeSession.clear();
    } catch {
      throw new Error(i18n.t("auth:errors.deleteAccount"));
    }
  }

  async sendContactMessage(data: ContactMessageData): Promise<ContactMessageResponse> {
    try {
      return await this.post<ContactMessageResponse>("/users/contact", {
        subject: data.subject,
        message: data.message,
      });
    } catch {
      throw new Error(i18n.t("auth:errors.contact"));
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
  checkResetToken: (token: string) => userApiServiceInstance.checkResetToken(token),
  getCurrentUser: () => userApiServiceInstance.getCurrentUser(),
  getCurrentUserSettings: () => userApiServiceInstance.getCurrentUserSettings(),
  confirmEmail: (token: string) => userApiServiceInstance.confirmEmail(token),
  resendEmailConfirmation: () => userApiServiceInstance.resendEmailConfirmation(),
  requestEmailChange: (data: EmailChangeData) => userApiServiceInstance.requestEmailChange(data),
  changePassword: (data: PasswordChangeData) => userApiServiceInstance.changePassword(data),
  setCurrency: (currency: "EUR" | "USD") => userApiServiceInstance.setCurrency(currency),
  setLanguage: (language: LanguagePreference) => userApiServiceInstance.setLanguage(language),
  deleteAccount: () => userApiServiceInstance.deleteAccount(),
  sendContactMessage: (data: ContactMessageData) => userApiServiceInstance.sendContactMessage(data),
};
