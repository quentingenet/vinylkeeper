import { describe, it, expect, vi, beforeEach } from "vitest";

interface SentRequest {
  url: string;
  headers: Record<string, string>;
  responseType?: string;
}
const request = vi.fn<(options: SentRequest) => Promise<unknown>>();
vi.mock("@capacitor/core", () => ({ CapacitorHttp: { request } }));

const tokens = { access: "access-1" as string | null, refresh: "refresh-1" as string | null };
const nativeSession = {
  getAccessToken: vi.fn(() => Promise.resolve(tokens.access)),
  getRefreshToken: vi.fn(() => Promise.resolve(tokens.refresh)),
  save: vi.fn((next: { accessToken: string; refreshToken: string }) => {
    tokens.access = next.accessToken;
    tokens.refresh = next.refreshToken;
    return Promise.resolve();
  }),
  clear: vi.fn(() => {
    tokens.access = null;
    tokens.refresh = null;
    return Promise.resolve();
  }),
};
vi.mock("../NativeSession", () => ({ nativeSession }));
vi.mock("../GlobalUtils", () => ({ API_VK_URL: "https://api.test/api" }));

const { capacitorHttpService } = await import("../CapacitorHttpService");

const reply = (status: number, data: unknown = {}, headers: Record<string, string> = { "Content-Type": "application/json" }) =>
  ({ status, data, headers, url: "" });

const headersOfCall = (index: number) => request.mock.calls[index][0].headers;

describe("capacitorHttpService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokens.access = "access-1";
    tokens.refresh = "refresh-1";
  });

  it("authenticates with a Bearer token, and sends no CSRF header nor cookie", async () => {
    request.mockResolvedValueOnce(reply(200, { ok: true }));

    expect(await capacitorHttpService.get("/users/me")).toEqual({ ok: true });

    const sent = request.mock.calls[0][0];
    expect(sent.url).toBe("https://api.test/api/users/me");
    expect(headersOfCall(0).Authorization).toBe("Bearer access-1");
    expect(Object.keys(headersOfCall(0))).not.toContain("X-CSRF-Token");
  });

  it("sends no Authorization header without a session", async () => {
    tokens.access = null;
    request.mockResolvedValueOnce(reply(200, {}));
    await capacitorHttpService.post("/users/auth", { email: "a" }, true);
    expect(Object.keys(headersOfCall(0))).not.toContain("Authorization");
  });

  it("parses a JSON string body, whatever the case of the header name", async () => {
    request.mockResolvedValueOnce(reply(200, '{"a":1}', { "content-type": "application/json; charset=utf-8" }));
    expect(await capacitorHttpService.get("/x")).toEqual({ a: 1 });
  });

  it("renews the tokens on a 401 with the refresh token as Bearer, then replays the request once", async () => {
    request
      .mockResolvedValueOnce(reply(401, { code: 1000, message: "expired", details: {} }))
      .mockResolvedValueOnce(reply(200, { access_token: "access-2", refresh_token: "refresh-2" }))
      .mockResolvedValueOnce(reply(200, { done: true }));

    expect(await capacitorHttpService.put("/users/me/currency", { currency: "USD" })).toEqual({ done: true });

    expect(request.mock.calls[1][0].url).toBe("https://api.test/api/users/refresh-token");
    expect(headersOfCall(1).Authorization).toBe("Bearer refresh-1");
    expect(nativeSession.save).toHaveBeenCalledWith({ accessToken: "access-2", refreshToken: "refresh-2" });
    expect(headersOfCall(2).Authorization).toBe("Bearer access-2");
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not loop when the replayed request is refused again", async () => {
    request
      .mockResolvedValueOnce(reply(401, { code: 1, message: "no", details: {} }))
      .mockResolvedValueOnce(reply(200, { access_token: "a2", refresh_token: "r2" }))
      .mockResolvedValueOnce(reply(401, { code: 1, message: "still no", details: {} }));

    await expect(capacitorHttpService.get("/x")).rejects.toMatchObject({ code: 1, message: "still no" });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not try to renew when asked not to (login, register)", async () => {
    request.mockResolvedValueOnce(reply(401, { code: 1000, message: "Invalid email or password", details: {} }));

    await expect(capacitorHttpService.post("/users/auth", {}, true)).rejects.toMatchObject({ code: 1000 });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("ends the session when the refresh token is refused: tokens erased, session expired", async () => {
    request
      .mockResolvedValueOnce(reply(401, {}))
      .mockResolvedValueOnce(reply(401, { message: "Session revoked" }));

    await expect(capacitorHttpService.get("/x")).rejects.toMatchObject({
      code: 401,
      message: "Session expired. Please log in again.",
    });
    expect(nativeSession.clear).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the refresh fails on the network: the user is offline, not logged out", async () => {
    request
      .mockResolvedValueOnce(reply(401, {}))
      .mockRejectedValueOnce(new Error("Unable to resolve host"));

    await expect(capacitorHttpService.get("/x")).rejects.toMatchObject({ code: 9999 });
    expect(nativeSession.clear).not.toHaveBeenCalled();
  });

  it("is a session expired, without any request, when there is no refresh token", async () => {
    tokens.refresh = null;
    await expect(capacitorHttpService.refreshSession()).rejects.toMatchObject({ code: 401 });
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects a refresh answer without tokens and keeps what it has", async () => {
    request.mockResolvedValueOnce(reply(200, { message: "ok" }));
    await expect(capacitorHttpService.refreshSession()).rejects.toBeDefined();
    expect(nativeSession.save).not.toHaveBeenCalled();
    expect(nativeSession.clear).not.toHaveBeenCalled();
  });

  it("shares one refresh between requests refused at the same time", async () => {
    request.mockImplementation(({ url, headers }) => {
      if (url.endsWith("/users/refresh-token")) {
        return Promise.resolve(reply(200, { access_token: "access-2", refresh_token: "refresh-2" }));
      }
      return Promise.resolve(headers.Authorization === "Bearer access-2" ? reply(200, { ok: 1 }) : reply(401, {}));
    });

    await Promise.all([capacitorHttpService.get("/a"), capacitorHttpService.get("/b"), capacitorHttpService.get("/c")]);

    const refreshes = request.mock.calls.filter(([options]) => options.url.endsWith("/users/refresh-token"));
    expect(refreshes).toHaveLength(1);
    request.mockReset();
  });

  it("turns an API error body into an ApiError", async () => {
    request.mockResolvedValueOnce(reply(403, '{"code":4003,"message":"Forbidden","details":{}}'));
    await expect(capacitorHttpService.get("/x")).rejects.toEqual({ code: 4003, message: "Forbidden", details: {} });
  });

  describe("revokeSession", () => {
    it("presents the refresh token as a Bearer so the server ends this device's session", async () => {
      request.mockResolvedValueOnce(reply(200, {}));

      await capacitorHttpService.revokeSession();

      expect(request.mock.calls[0][0].url).toBe("https://api.test/api/users/logout");
      expect(headersOfCall(0).Authorization).toBe("Bearer refresh-1");
    });

    it("sends nothing without a refresh token", async () => {
      tokens.refresh = null;
      await capacitorHttpService.revokeSession();
      expect(request).not.toHaveBeenCalled();
    });

    it("does not fail when the network is down", async () => {
      request.mockRejectedValueOnce(new Error("Unable to resolve host"));
      await expect(capacitorHttpService.revokeSession()).resolves.toBeUndefined();
    });
  });

  it("stores the new refresh token the server gives at each refresh", async () => {
    request.mockResolvedValueOnce(reply(200, { access_token: "a-next", refresh_token: "r-next" }));
    await capacitorHttpService.refreshSession();
    expect(nativeSession.save).toHaveBeenCalledWith({ accessToken: "a-next", refreshToken: "r-next" });
    expect(tokens.refresh).toBe("r-next");
  });

  describe("getBlob", () => {
    it("asks for the file as a blob with the session, and decodes it", async () => {
      request.mockResolvedValueOnce(reply(200, btoa("a;b\n1;2"), {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="jazz_1_2026-11-10_albums.csv"',
      }));

      const { blob, filename } = await capacitorHttpService.getBlob("/collections/1/export/albums.csv");

      expect(request.mock.calls[0][0].responseType).toBe("blob");
      expect(headersOfCall(0).Authorization).toBe("Bearer access-1");
      expect(filename).toBe("jazz_1_2026-11-10_albums.csv");
      expect(blob.type).toBe("text/csv");
      expect(blob.size).toBe(7);
    });

    it("renews an expired session like any other request", async () => {
      request
        .mockResolvedValueOnce(reply(401, {}))
        .mockResolvedValueOnce(reply(200, { access_token: "a2", refresh_token: "r2" }))
        .mockResolvedValueOnce(reply(200, btoa("x"), { "content-type": "text/csv" }));

      const { blob } = await capacitorHttpService.getBlob("/x");
      expect(blob.size).toBe(1);
    });
  });
});
