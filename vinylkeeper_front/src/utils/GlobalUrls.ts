/**
 * Enum containing all the application's URLs
 * @enum {string}
 *
 * @property {string} ROOT - Home page URL "/"
 * @property {string} DASHBOARD - Dashboard page URL "/dashboard"
 * @property {string} COLLECTIONS - Collections page URL "/collections"
 * @property {string} ADD_VINYLS - "/add-vinyls": opens the add record dialog over the dashboard (older links)
 * @property {string} EXPLORE - Legacy Explore URL "/explore", redirects to the Community tab of Collections
 * @property {string} WISHLIST - Wishlist page URL "/wishlist"
 * @property {string} ATLAS - Vinyl Atlas page URL "/atlas" (formerly "/places", redirected)
 * @property {string} SPINNING_NOW - Spinning now page URL "/spinning-now"
 * @property {string} SETTINGS - Settings page URL "/settings"
 * @property {string} RESET_PASSWORD - Reset password page URL "/reset-password"
 * @property {string} CONFIRM_EMAIL - Page of the email confirmation link "/confirm-email", logged in or not
 * @property {string} NO_MATCH - 404 page URL "*"
 */
export enum EGlobalUrls {
  ROOT = "/",
  DASHBOARD = "/dashboard",
  COLLECTIONS = "/collections",
  COLLECTION_DETAILS = "/collections/:id",
  // The public link of a collection: a random key, so that links cannot be guessed
  SHARED_COLLECTION = "/shared/:token",
  ADD_VINYLS = "/add-vinyls",
  EXPLORE = "/explore",
  WISHLIST = "/wishlist",
  ATLAS = "/atlas",
  // Former URL of the Atlas: old links and bookmarks are redirected
  PLACES_LEGACY = "/places",
  SPINNING_NOW = "/spinning-now",
  SETTINGS = "/settings",
  ADMIN = "/admin",
  RESET_PASSWORD = "/reset-password",
  // Where Discogs sends the user back from its authorization page: the Android app opens on it
  DISCOGS_CALLBACK = "/discogs/callback",
  CONFIRM_EMAIL = "/confirm-email",
  // Terms of use and privacy notice: a public page with its own address (app stores ask for one)
  TERMS = "/terms",
  NO_MATCH = "*",
}

export const COLLECTIONS_TAB_PARAM = "tab";
export const COMMUNITY_TAB_VALUE = "community";
// Page and sort of the collections lists: in the URL, so coming back to the list keeps them
export const COLLECTIONS_PAGE_PARAM = "page";
export const COMMUNITY_SORT_PARAM = "sort";

/** Collections page opened on the Community tab (replaces the former /explore page) */
export const COMMUNITY_COLLECTIONS_URL = `${EGlobalUrls.COLLECTIONS}?${COLLECTIONS_TAB_PARAM}=${COMMUNITY_TAB_VALUE}`;

// The home page opens its login or sign up form from this parameter (links of the public Atlas)
export const AUTH_PARAM = "auth";
// The page of the site to come back to once logged in (a shared collection)
export const NEXT_PARAM = "next";
const authUrl = (form: "login" | "register", nextPath?: string) =>
  `${EGlobalUrls.ROOT}?${AUTH_PARAM}=${form}${nextPath ? `&${NEXT_PARAM}=${encodeURIComponent(nextPath)}` : ""}`;
export const loginUrl = (nextPath?: string) => authUrl("login", nextPath);
export const registerUrl = (nextPath?: string) => authUrl("register", nextPath);
export const LOGIN_URL = loginUrl();
export const REGISTER_URL = registerUrl();

/** A path of this site only: "//other.site" or an absolute URL in a link must not redirect there. */
export const safeNextPath = (value: string | null): string | null =>
  value && /^\/(?![/\\])/.test(value) ? value : null;

export const collectionUrl = (collectionId: number) => `${EGlobalUrls.COLLECTIONS}/${collectionId}`;
export const sharedCollectionUrl = (token: string) => `/shared/${token}`;
