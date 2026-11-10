import { SecureStorage } from "@aparajita/capacitor-secure-storage";
import { logger } from "./logger";

/**
 * The session of the Android app. The browser keeps its tokens in httpOnly cookies; the app has
 * no cookie to trust, it holds its two tokens itself and sends them as "Authorization: Bearer".
 * They live in the Android Keystore (encrypted at rest), never in localStorage, which any script
 * of the WebView can read. A copy stays in memory so a request does not wait on the Keystore.
 */
export interface NativeTokens {
  accessToken: string;
  refreshToken: string;
}

const KEY_PREFIX = "vinylkeeper_";
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

let tokens: NativeTokens | null = null;
let loading: Promise<void> | null = null;

/** Reads the Keystore once. Unreadable: no session, the user logs in again. */
const loaded = (): Promise<void> => {
  loading ??= (async () => {
    try {
      await SecureStorage.setKeyPrefix(KEY_PREFIX);
      const [accessToken, refreshToken] = await Promise.all([
        SecureStorage.getItem(ACCESS_KEY),
        SecureStorage.getItem(REFRESH_KEY),
      ]);
      tokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    } catch (error) {
      logger.error("Secure storage unreadable, the session is not restored:", error);
      tokens = null;
    }
  })();
  return loading;
};

export const nativeSession = {
  async getAccessToken(): Promise<string | null> {
    await loaded();
    return tokens?.accessToken ?? null;
  },

  async getRefreshToken(): Promise<string | null> {
    await loaded();
    return tokens?.refreshToken ?? null;
  },

  /** Keeps the tokens the API just issued. They stay usable in memory if the Keystore refuses them. */
  async save(next: NativeTokens): Promise<void> {
    await loaded();
    tokens = next;
    try {
      await SecureStorage.setItem(ACCESS_KEY, next.accessToken);
      await SecureStorage.setItem(REFRESH_KEY, next.refreshToken);
    } catch (error) {
      logger.error("Secure storage not writable, the session will not survive a restart:", error);
    }
  },

  /** Logout, revoked session, deleted account: nothing is kept, in memory nor on the device. */
  async clear(): Promise<void> {
    await loaded();
    tokens = null;
    // Each key on its own: one that is already gone must not keep the other one
    const results = await Promise.allSettled([
      SecureStorage.removeItem(ACCESS_KEY),
      SecureStorage.removeItem(REFRESH_KEY),
    ]);
    for (const result of results) {
      if (result.status === "rejected") logger.error("Secure storage not cleared:", result.reason);
    }
  },
};
