export interface StreamingPlatform {
  name: string;
  icon: string;
  // Web search page of the platform, for a query already encoded
  searchUrl: (query: string) => string;
  // Android app opened by the intent link, the web page being its fallback
  androidPackage: string;
  // Link of the app's own scheme, for an app that does not open the web search page itself
  appUrl?: (query: string) => string;
  // The same for the Android app of Vinyl Keeper, which opens the music app itself. Its scheme comes
  // from .env.mobile; without it (a build that has none) the web search link, which the music app
  // opens too, is used.
  nativeUrl?: (query: string) => string | undefined;
}

/** What the Android app asks the system to open: the music app first, the web page when it is missing. */
export interface NativeLaunch {
  url: string;
  packageName: string;
  fallbackUrl: string;
}

export const streamingPlatforms: StreamingPlatform[] = [
  {
    name: "Spotify",
    icon: "🎧",
    searchUrl: (query) => `${import.meta.env.VITE_SPOTIFY_WEB_URL}/${query}`,
    androidPackage: "com.spotify.music",
    // spotify:search:<query>
    nativeUrl: (query) =>
      import.meta.env.VITE_SPOTIFY_MOBILE_URL ? `${import.meta.env.VITE_SPOTIFY_MOBILE_URL}:${query}` : undefined,
  },
  {
    name: "Deezer",
    icon: "🎧",
    searchUrl: (query) => `${import.meta.env.VITE_DEEZER_WEB_URL}/${query}`,
    androidPackage: "deezer.android.app",
    // Checked on a phone: the app opens its search screen with deezer://www.deezer.com/search/<query>,
    // and does not resolve deezer://search/<query>
    appUrl: (query) => `deezer://www.deezer.com/search/${query}`,
    // The Android app reads the link from .env.mobile (VITE_DEEZER_MOBILE_URL=deezer://www.deezer.com/search),
    // and uses the link above when a build has none
    nativeUrl: (query) =>
      import.meta.env.VITE_DEEZER_MOBILE_URL ? `${import.meta.env.VITE_DEEZER_MOBILE_URL}/${query}` : undefined,
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

/** The link the Android app opens in the music app of a platform, the web search page as its fallback. */
export function nativeLaunch(platform: StreamingPlatform, query: string): NativeLaunch {
  const fallbackUrl = platform.searchUrl(query);
  return {
    url: platform.nativeUrl?.(query) ?? platform.appUrl?.(query) ?? fallbackUrl,
    packageName: platform.androidPackage,
    fallbackUrl,
  };
}
