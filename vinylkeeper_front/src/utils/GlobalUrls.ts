/**
 * Enum containing all the application's URLs
 * @enum {string}
 *
 * @property {string} ROOT - Home page URL "/"
 * @property {string} DASHBOARD - Dashboard page URL "/dashboard"
 * @property {string} COLLECTIONS - Collections page URL "/collections"
 * @property {string} ADD_VINYLS - Add vinyls page URL "/add-vinyls"
 * @property {string} EXPLORE - Legacy Explore URL "/explore", redirects to the Community tab of Collections
 * @property {string} WISHLIST - Wishlist page URL "/wishlist"
 * @property {string} PLACES - Places page URL "/places"
 * @property {string} SETTINGS - Settings page URL "/settings"
 * @property {string} RESET_PASSWORD - Reset password page URL "/reset-password"
 * @property {string} NO_MATCH - 404 page URL "*"
 */
export enum EGlobalUrls {
  ROOT = "/",
  DASHBOARD = "/dashboard",
  COLLECTIONS = "/collections",
  COLLECTION_DETAILS = "/collections/:id",
  ADD_VINYLS = "/add-vinyls",
  EXPLORE = "/explore",
  WISHLIST = "/wishlist",
  PLACES = "/places",
  SETTINGS = "/settings",
  ADMIN = "/admin",
  RESET_PASSWORD = "/reset-password",
  NO_MATCH = "*",
}

export const COLLECTIONS_TAB_PARAM = "tab";
export const COMMUNITY_TAB_VALUE = "community";

/** Collections page opened on the Community tab (replaces the former /explore page) */
export const COMMUNITY_COLLECTIONS_URL = `${EGlobalUrls.COLLECTIONS}?${COLLECTIONS_TAB_PARAM}=${COMMUNITY_TAB_VALUE}`;
