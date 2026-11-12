import { describe, it, expect, vi, beforeEach } from "vitest";

const native = { value: false };
vi.mock("@utils/CapacitorUtils", () => ({ isCapacitorPlatform: () => native.value }));

const http = { post: vi.fn() };
vi.mock("@utils/CapacitorHttpService", () => ({ capacitorHttpService: http }));

const requestService = vi.fn();
vi.mock("@utils/RequestService", () => ({ default: requestService }));

const { userApiService } = await import("../UserApiService");
const { RESET_LINK_UNUSABLE } = await import("@utils/resetLink");

const INVALID_TOKEN = { code: 1004, message: "Invalid or expired reset token", details: {} };

describe("the link of a reset email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.value = false;
  });

  it("is checked without trying to renew a session the visitor does not have", async () => {
    requestService.mockResolvedValueOnce({ message: "Reset link is valid" });

    await userApiService.checkResetToken("tok-1");

    expect(requestService.mock.calls[0][0]).toMatchObject({
      method: "POST",
      endpoint: "/users/reset-password/check",
      body: { token: "tok-1" },
      skipRefresh: true,
    });
  });

  it("says when the link was already used or has expired", async () => {
    requestService.mockRejectedValueOnce(INVALID_TOKEN);

    await expect(userApiService.checkResetToken("tok-1")).rejects.toThrow(RESET_LINK_UNUSABLE);
  });

  it("does not call a network failure an expired link", async () => {
    requestService.mockRejectedValueOnce({ code: 9999, message: "Failed to fetch", details: {} });

    await expect(userApiService.checkResetToken("tok-1")).rejects.toThrow("The link could not be checked");
  });

  it("sends the new password without a session refresh, and says when the link no longer works", async () => {
    requestService.mockRejectedValueOnce(INVALID_TOKEN);

    await expect(userApiService.resetPassword({ token: "tok-1", new_password: "secret12" })).rejects.toThrow(
      RESET_LINK_UNUSABLE
    );
    expect(requestService.mock.calls[0][0]).toMatchObject({
      endpoint: "/users/reset-password",
      skipRefresh: true,
    });
  });

  it("keeps the generic message for any other failure", async () => {
    requestService.mockRejectedValueOnce({ code: 500, message: "boom", details: {} });

    await expect(userApiService.resetPassword({ token: "tok-1", new_password: "secret12" })).rejects.toThrow(
      "Failed to reset password. Please try again."
    );
  });

  it("goes through the Android client in the app", async () => {
    native.value = true;
    http.post.mockResolvedValueOnce({ message: "ok" });

    await userApiService.checkResetToken("tok-1");

    expect(http.post).toHaveBeenCalledWith("/users/reset-password/check", { token: "tok-1" }, true);
    expect(requestService).not.toHaveBeenCalled();
  });
});
