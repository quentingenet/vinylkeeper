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

/** The address the iOS app comes back to from Discogs, caught by its sign-in sheet (DiscogsAuthSessionPlugin). */
export const IOS_APP_SCHEME = "org.vinylkeeper.app";
export const IOS_DISCOGS_RETURN = `${IOS_APP_SCHEME}://discogs/callback`;
/** The mark the back adds to the callback of the iOS app (ios_callback), kept by Discogs */
export const IOS_CALLBACK_PARAM = "app";

const SHARE_TOKEN = /^[0-9a-f]{32}$/;
const MAX_PARAM_LENGTH = 255;

type DiscogsReturn = Extract<AppLinkTarget, { kind: "discogs-authorized" | "discogs-denied" }>;

/** What Discogs sent back: the authorization, its refusal, or nothing usable. */
function discogsReturn(params: URLSearchParams): DiscogsReturn | null {
  const token = params.get("oauth_token") ?? "";
  const verifier = params.get("oauth_verifier") ?? "";
  if (params.has("denied")) return { kind: "discogs-denied" };
  if (token && verifier && token.length <= MAX_PARAM_LENGTH && verifier.length <= MAX_PARAM_LENGTH) {
    return { kind: "discogs-authorized", oauthToken: token, oauthVerifier: verifier };
  }
  return null;
}

/** The address the iOS sign-in sheet hands back (org.vinylkeeper.app://discogs/callback?...). */
export function parseIosDiscogsReturn(rawUrl: string): DiscogsReturn | null {
  if (!rawUrl.startsWith(`${IOS_DISCOGS_RETURN}?`)) return null;
  return discogsReturn(new URLSearchParams(rawUrl.slice(IOS_DISCOGS_RETURN.length + 1)));
}

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

  return url.pathname === DISCOGS_CALLBACK_PATH ? discogsReturn(url.searchParams) : null;
}

/** The page of the app that tells how the Discogs connection ended (it opens the import dialog). */
export const discogsOutcomeUrl = (outcome: string): string =>
  `${EGlobalUrls.COLLECTIONS}?discogs=${encodeURIComponent(outcome)}`;

/**
 * The return of the iOS app (marked app=ios by the back): the same answer of Discogs, on the address its
 * sign-in sheet waits for. Null for any other return.
 */
export function iosReturnUrl(search: string): string | null {
  const params = new URLSearchParams(search);
  if (params.get(IOS_CALLBACK_PARAM) !== "ios") return null;
  params.delete(IOS_CALLBACK_PARAM);
  return `${IOS_DISCOGS_RETURN}?${params.toString()}`;
}
