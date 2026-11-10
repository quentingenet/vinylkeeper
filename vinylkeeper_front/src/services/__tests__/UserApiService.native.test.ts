import { describe, it, expect, vi, beforeEach } from "vitest";

const native = { value: true };
vi.mock("@utils/CapacitorUtils", () => ({ isCapacitorPlatform: () => native.value }));

const http = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
  getBlob: vi.fn(),
};
vi.mock("@utils/CapacitorHttpService", () => ({ capacitorHttpService: http }));

const nativeSession = { save: vi.fn(), clear: vi.fn() };
vi.mock("@utils/NativeSession", () => ({ nativeSession }));

const requestService = vi.fn<(options: { body?: unknown; endpoint: string }) => Promise<unknown>>();
vi.mock("@utils/RequestService", () => ({ default: requestService }));

const { UserApiService } = await import("../UserApiService");

const loginForm = { email: "a@b.fr", password: "pw12" };

describe("UserApiService on the Android app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = true;
  });

  it("logs in as a native client, keeps the tokens and hands them to nobody", async () => {
    http.post.mockResolvedValueOnce({ isLoggedIn: true, access_token: "a", refresh_token: "r" });

    const result = await new UserApiService().login(loginForm);

    expect(http.post).toHaveBeenCalledWith(
      "/users/auth", { email: "a@b.fr", password: "pw12", client: "native" }, true);
    expect(nativeSession.save).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r" });
    expect(result).toEqual({ isLoggedIn: true });
  });

  it("registers as a native client and keeps the tokens", async () => {
    http.post.mockResolvedValueOnce({ message: "ok", isLoggedIn: true, access_token: "a", refresh_token: "r" });

    const result = await new UserApiService().register({
      username: "u", email: "a@b.fr", password: "pw12", isAcceptedTerms: true, timezone: "Europe/Paris",
    } as never);

    expect(http.post.mock.calls[0][1]).toMatchObject({ client: "native" });
    expect(nativeSession.save).toHaveBeenCalledWith({ accessToken: "a", refreshToken: "r" });
    expect(result).toEqual({ message: "ok", isLoggedIn: true });
  });

  it("restores the session through the Bearer refresh, not the cookie", async () => {
    http.refreshSession.mockResolvedValueOnce(undefined);

    expect(await new UserApiService().refreshToken()).toEqual({ isLoggedIn: true });
    expect(http.post).not.toHaveBeenCalled();
  });

  it("ends the session of this device on the server, then erases the tokens", async () => {
    http.revokeSession.mockResolvedValueOnce(undefined);

    await new UserApiService().logout();

    expect(http.revokeSession).toHaveBeenCalledTimes(1);
    expect(http.post).not.toHaveBeenCalled();
    expect(nativeSession.clear).toHaveBeenCalledTimes(1);
  });

  it("erases the tokens on logout even when the server call fails", async () => {
    http.revokeSession.mockRejectedValueOnce(new Error("boom"));

    await expect(new UserApiService().logout()).rejects.toBeDefined();
    expect(nativeSession.clear).toHaveBeenCalledTimes(1);
  });

  it("keeps the new tokens after a password change, which revokes the old ones", async () => {
    http.put.mockResolvedValueOnce({ message: "done", access_token: "a2", refresh_token: "r2" });

    const result = await new UserApiService().changePassword({
      currentPassword: "old1", newPassword: "new12345", confirmPassword: "new12345",
    });

    expect(nativeSession.save).toHaveBeenCalledWith({ accessToken: "a2", refreshToken: "r2" });
    expect(result).toEqual({ message: "done" });
  });

  it("erases the tokens once the account is deleted", async () => {
    http.delete.mockResolvedValueOnce(null);
    await new UserApiService().deleteAccount();
    expect(nativeSession.clear).toHaveBeenCalledTimes(1);
  });

  it("keeps the tokens when the account deletion fails", async () => {
    http.delete.mockRejectedValueOnce({ code: 500, message: "x", details: {} });
    await expect(new UserApiService().deleteAccount()).rejects.toBeDefined();
    expect(nativeSession.clear).not.toHaveBeenCalled();
  });
});

describe("UserApiService in the browser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = false;
  });

  it("asks for cookies: no client field, nothing stored on the device", async () => {
    requestService.mockResolvedValueOnce({ isLoggedIn: true });

    await new UserApiService().login(loginForm);

    expect(requestService.mock.calls[0][0].body).toEqual({ email: "a@b.fr", password: "pw12" });
    expect(nativeSession.save).not.toHaveBeenCalled();
  });

  it("refreshes through the cookie", async () => {
    requestService.mockResolvedValueOnce({ isLoggedIn: true });
    await new UserApiService().refreshToken();
    expect(requestService.mock.calls[0][0].endpoint).toBe("/users/refresh-token");
    expect(http.refreshSession).not.toHaveBeenCalled();
  });
});
