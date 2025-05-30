/**
 * Enum containing all the application's URLs
 * @enum {string}
 *
 * @property {string} ROOT - Home page URL "/"
 * @property {string} DASHBOARD - Dashboard page URL "/dashboard"
 * @property {string} COLLECTIONS - Collections page URL "/collections"
 * @property {string} ADD_VINYLS - Add vinyls page URL "/add-vinyls"
 * @property {string} EXPLORE - Explore page URL "/explore"
 * @property {string} WISHLIST - Wishlist page URL "/wishlist"
 * @property {string} LOANS - Loans page URL "/loans"
 * @property {string} COMMUNITY - Community page URL "/community"
 * @property {string} SETTINGS - Settings page URL "/settings"
 * @property {string} RESET_PASSWORD - Reset password page URL "/reset-password"
 * @property {string} CONTACT - Contact page URL "/contact"
 * @property {string} TERMS - Terms and conditions page URL "/vinylkeeper-terms-and-conditions"
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
  LOANS = "/loans",
  COMMUNITY = "/community",
  SETTINGS = "/settings",
  RESET_PASSWORD = "/reset-password",
  CONTACT = "/contact",
  TERMS = "/vinylkeeper-terms-and-conditions",
  NO_MATCH = "*",
}
