import { describe, it, expect, afterEach, vi } from "vitest";
import {
  nativeLaunch,
  streamingHref,
  streamingPlatforms,
  streamingQuery,
  type StreamingPlatform,
} from "@services/MusicStreamingService";

const deezer: StreamingPlatform = {
  name: "Deezer",
  icon: "🎧",
  searchUrl: (query) => `https://www.deezer.com/search/${query}`,
  androidPackage: "deezer.android.app",
};

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

describe("streamingQuery", () => {
  it("searches an album by artist and title", () => {
    expect(streamingQuery("Kind Of Blue", "Miles Davis", "album")).toBe("Miles%20Davis%20Kind%20Of%20Blue");
  });

  it("searches an artist by name only", () => {
    expect(streamingQuery("Miles Davis", "", "artist")).toBe("Miles%20Davis");
  });
});

describe("streamingHref", () => {
  const query = streamingQuery("Kind Of Blue", "Miles Davis", "album");

  it("opens the app in an Android browser, the web page as fallback", () => {
    expect(streamingHref(deezer, query, ANDROID)).toBe(
      "intent://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue#Intent;scheme=https;" +
        "package=deezer.android.app;" +
        "S.browser_fallback_url=https%3A%2F%2Fwww.deezer.com%2Fsearch%2FMiles%2520Davis%2520Kind%2520Of%2520Blue;end"
    );
  });

  it("opens the app through its own scheme when it has one", () => {
    const deezerApp = { ...deezer, appUrl: (q: string) => `deezer://www.deezer.com/search/${q}` };
    expect(streamingHref(deezerApp, query, ANDROID)).toBe(
      "intent://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue#Intent;scheme=deezer;" +
        "package=deezer.android.app;" +
        "S.browser_fallback_url=https%3A%2F%2Fwww.deezer.com%2Fsearch%2FMiles%2520Davis%2520Kind%2520Of%2520Blue;end"
    );
    expect(streamingHref(deezerApp, query, IPHONE)).toBe("https://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue");
  });

  it("gives the web page on iPhone, desktop and in the native app", () => {
    const web = "https://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue";
    expect(streamingHref(deezer, query, IPHONE)).toBe(web);
    expect(streamingHref(deezer, query, "")).toBe(web);
  });
});

describe("nativeLaunch (the Android app)", () => {
  afterEach(() => vi.unstubAllEnvs());
  const query = streamingQuery("Kind Of Blue", "Miles Davis", "album");
  const platform = (name: string) => streamingPlatforms.find((p) => p.name === name) as StreamingPlatform;

  const stubEnv = () => {
    vi.stubEnv("VITE_SPOTIFY_WEB_URL", "https://open.spotify.com/search");
    vi.stubEnv("VITE_DEEZER_WEB_URL", "https://www.deezer.com/search");
    vi.stubEnv("VITE_YOUTUBE_MUSIC_URL", "https://music.youtube.com/search");
    vi.stubEnv("VITE_SPOTIFY_MOBILE_URL", "spotify:search");
    vi.stubEnv("VITE_DEEZER_MOBILE_URL", "deezer://www.deezer.com/search");
  };

  it("opens Spotify through its scheme, the web search as fallback", () => {
    stubEnv();
    expect(nativeLaunch(platform("Spotify"), query)).toEqual({
      url: "spotify:search:Miles%20Davis%20Kind%20Of%20Blue",
      packageName: "com.spotify.music",
      fallbackUrl: "https://open.spotify.com/search/Miles%20Davis%20Kind%20Of%20Blue",
    });
  });

  it("opens the search screen of the Deezer app, with the link Deezer resolves", () => {
    stubEnv();
    // deezer://search/<query> is not understood by the app: checked on a phone
    expect(nativeLaunch(platform("Deezer"), query)).toEqual({
      url: "deezer://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue",
      packageName: "deezer.android.app",
      fallbackUrl: "https://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue",
    });
  });

  it("gives the web search link to YouTube Music, which the app opens by itself", () => {
    stubEnv();
    expect(nativeLaunch(platform("YouTube Music"), query)).toEqual({
      url: "https://music.youtube.com/search?q=Miles%20Davis%20Kind%20Of%20Blue",
      packageName: "com.google.android.apps.youtube.music",
      fallbackUrl: "https://music.youtube.com/search?q=Miles%20Davis%20Kind%20Of%20Blue",
    });
  });

  it("reads the link of Deezer from the environment, and falls back to the one that works", () => {
    stubEnv();
    vi.stubEnv("VITE_DEEZER_MOBILE_URL", "");
    expect(nativeLaunch(platform("Deezer"), query).url).toBe(
      "deezer://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue"
    );
  });

  it("still opens the app when a build has no scheme: the web link, aimed at the package", () => {
    vi.stubEnv("VITE_SPOTIFY_WEB_URL", "https://open.spotify.com/search");
    vi.stubEnv("VITE_SPOTIFY_MOBILE_URL", "");
    expect(nativeLaunch(platform("Spotify"), query).url).toBe(
      "https://open.spotify.com/search/Miles%20Davis%20Kind%20Of%20Blue"
    );
  });

  it("only names the three apps the Android side accepts", () => {
    expect(streamingPlatforms.map((p) => p.androidPackage).sort()).toEqual([
      "com.google.android.apps.youtube.music",
      "com.spotify.music",
      "deezer.android.app",
    ]);
  });
});
