import { EGlobalUrls, sharedCollectionUrl } from "./GlobalUrls";

/** The host whose links open the app (Android App Links, verified through its assetlinks.json). */
export const APP_LINK_HOST = "vinylkeeper.org";

/** The page Discogs sends the user back to, which opens the app. */
export const DISCOGS_CALLBACK_PATH: string = EGlobalUrls.DISCOGS_CALLBACK;

/** What a link opened in the app asks for. Anything else is ignored: a link never picks any page. */
export type AppLinkTarget =
  | { kind: "page"; path: string }
  | { kind: "discogs-authorized"; oauthToken: string; oauthVerifier: string }
  | { kind: "discogs-denied" };

const SHARE_TOKEN = /^[0-9a-f]{32}$/;
const MAX_PARAM_LENGTH = 255;

export function parseAppLink(rawUrl: string): AppLinkTarget | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== APP_LINK_HOST) return null;

  const share = /^\/shared\/([^/]+)\/?$/.exec(url.pathname);
  if (share) {
    return SHARE_TOKEN.test(share[1]) ? { kind: "page", path: sharedCollectionUrl(share[1]) } : null;
  }

  if (url.pathname === DISCOGS_CALLBACK_PATH) {
    const token = url.searchParams.get("oauth_token") ?? "";
    const verifier = url.searchParams.get("oauth_verifier") ?? "";
    if (url.searchParams.has("denied")) return { kind: "discogs-denied" };
    if (token && verifier && token.length <= MAX_PARAM_LENGTH && verifier.length <= MAX_PARAM_LENGTH) {
      return { kind: "discogs-authorized", oauthToken: token, oauthVerifier: verifier };
    }
  }
  return null;
}

/** The page of the app that tells how the Discogs connection ended (it opens the import dialog). */
export const discogsOutcomeUrl = (outcome: string): string =>
  `${EGlobalUrls.COLLECTIONS}?discogs=${encodeURIComponent(outcome)}`;
