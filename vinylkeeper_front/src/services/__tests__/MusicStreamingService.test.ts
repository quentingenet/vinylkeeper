import { describe, it, expect } from "vitest";
import { streamingHref, streamingQuery, type StreamingPlatform } from "@services/MusicStreamingService";

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

  it("gives the web page on iPhone, desktop and in the native app", () => {
    const web = "https://www.deezer.com/search/Miles%20Davis%20Kind%20Of%20Blue";
    expect(streamingHref(deezer, query, IPHONE)).toBe(web);
    expect(streamingHref(deezer, query, "")).toBe(web);
  });
});
