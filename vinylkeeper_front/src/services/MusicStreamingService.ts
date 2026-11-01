export interface StreamingPlatform {
  name: string;
  icon: string;
  // Web search page of the platform, for a query already encoded
  searchUrl: (query: string) => string;
  // Android app opened by the intent link, the web page being its fallback
  androidPackage: string;
  // Link of the app's own scheme, for an app that does not open the web search page itself
  appUrl?: (query: string) => string;
}

export const streamingPlatforms: StreamingPlatform[] = [
  {
    name: "Spotify",
    icon: "🎧",
    searchUrl: (query) => `${import.meta.env.VITE_SPOTIFY_WEB_URL}/${query}`,
    androidPackage: "com.spotify.music",
  },
  {
    name: "Deezer",
    icon: "🎧",
    searchUrl: (query) => `${import.meta.env.VITE_DEEZER_WEB_URL}/${query}`,
    androidPackage: "deezer.android.app",
    // The app opens album, artist and track pages of deezer.com but sends its search back to the browser
    appUrl: (query) => `deezer://www.deezer.com/search/${query}`,
  },
  {
    name: "YouTube Music",
    icon: "🎧",
    searchUrl: (query) => `${import.meta.env.VITE_YOUTUBE_MUSIC_URL}?q=${query}`,
    androidPackage: "com.google.android.apps.youtube.music",
  },
];

/** "Artist Title" for an album, the name for an artist, encoded for a URL. */
export function streamingQuery(title: string, artist: string, itemType: "album" | "artist"): string {
  const parts = itemType === "album" ? [artist, title].filter(Boolean) : [title];
  return encodeURIComponent(Array.from(new Set(parts)).join(" "));
}

/**
 * Link to the search of a platform. In an Android browser, an intent link opens the app when it is
 * installed and the web page otherwise; elsewhere the web page (iOS opens the app itself for the
 * links it declares, on a tap).
 */
export function streamingHref(platform: StreamingPlatform, query: string, userAgent: string): string {
  const url = platform.searchUrl(query);
  if (!/Android/i.test(userAgent) || !url.startsWith("https://")) return url;
  const [scheme, path] = (platform.appUrl?.(query) ?? url).split("://");
  return (
    `intent://${path}#Intent;scheme=${scheme};package=${platform.androidPackage};` +
    `S.browser_fallback_url=${encodeURIComponent(url)};end`
  );
}
