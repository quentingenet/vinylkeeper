import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
const storage = {
  setKeyPrefix: vi.fn(() => Promise.resolve()),
  getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
    return Promise.resolve();
  }),
};

vi.mock("@aparajita/capacitor-secure-storage", () => ({ SecureStorage: storage }));
vi.mock("../logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

/** The module keeps its tokens in memory: each test starts from a fresh load. */
const freshSession = async () => {
  vi.resetModules();
  return (await import("../NativeSession")).nativeSession;
};

describe("nativeSession", () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  it("has no session on a fresh device", async () => {
    const session = await freshSession();
    expect(await session.getAccessToken()).toBeNull();
    expect(await session.getRefreshToken()).toBeNull();
  });

  it("restores the tokens kept by a previous run, under its own key prefix", async () => {
    store.set("access_token", "a1");
    store.set("refresh_token", "r1");
    const session = await freshSession();

    expect(await session.getAccessToken()).toBe("a1");
    expect(await session.getRefreshToken()).toBe("r1");
    expect(storage.setKeyPrefix).toHaveBeenCalledWith("vinylkeeper_");
  });

  it("keeps both tokens in the secure storage", async () => {
    const session = await freshSession();
    await session.save({ accessToken: "a2", refreshToken: "r2" });

    expect(store.get("access_token")).toBe("a2");
    expect(store.get("refresh_token")).toBe("r2");
    expect(await session.getAccessToken()).toBe("a2");
  });

  it("is no session at all when only one token was kept", async () => {
    store.set("access_token", "a1");
    const session = await freshSession();
    expect(await session.getAccessToken()).toBeNull();
  });

  it("erases the tokens from memory and from the device", async () => {
    const session = await freshSession();
    await session.save({ accessToken: "a", refreshToken: "r" });
    await session.clear();

    expect(await session.getRefreshToken()).toBeNull();
    expect(store.size).toBe(0);
  });

  it("erases the other token even when one removal fails", async () => {
    const session = await freshSession();
    await session.save({ accessToken: "a", refreshToken: "r" });
    storage.removeItem.mockImplementationOnce(() => Promise.reject(new Error("gone")));

    await session.clear();

    expect(store.has("refresh_token")).toBe(false);
    expect(await session.getAccessToken()).toBeNull();
  });

  it("falls back to no session when the storage is unreadable", async () => {
    storage.getItem.mockImplementationOnce(() => Promise.reject(new Error("keystore locked")));
    const session = await freshSession();
    expect(await session.getAccessToken()).toBeNull();
  });

  it("keeps the session in memory when the storage refuses a write", async () => {
    const session = await freshSession();
    storage.setItem.mockImplementationOnce(() => Promise.reject(new Error("full")));

    await session.save({ accessToken: "a3", refreshToken: "r3" });

    expect(await session.getAccessToken()).toBe("a3");
  });
});
