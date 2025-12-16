import { API_VK_URL } from "./GlobalUtils";

/**
 * Builds a proxy image URL for Discogs images.
 *
 * The proxy endpoint fetches images from Discogs, resizes them to requested dimensions,
 * converts to WebP by default (with JPEG fallback), and caches results on disk.
 *
 * @param src - Source image URL from Discogs (must be from i.discogs.com)
 * @param w - Target width in pixels
 * @param h - Target height in pixels
 * @param q - Quality (1-100, default 85)
 * @returns Proxy image URL
 */
export function buildProxyImageUrl(
  src: string,
  w: number,
  h: number,
  q: number = 85
): string {
  if (!src || !src.trim() || !src.includes("i.discogs.com")) {
    return "";
  }

  const params = new URLSearchParams({
    src: src.trim(),
    w: String(w),
    h: String(h),
    q: String(q),
  });

  return `${API_VK_URL}/images/proxy?${params.toString()}`;
}
