import { describe, it, expect } from "vitest";
import { discogsCollectionUrl, discogsPageUrl, discogsSearchUrl } from "@utils/discogsLinks";

describe("Discogs links", () => {
  it("points to the release or the artist", () => {
    expect(discogsPageUrl("album", "380980")).toBe("https://www.discogs.com/release/380980");
    expect(discogsPageUrl("artist", "84752")).toBe("https://www.discogs.com/artist/84752");
  });

  it("falls back to Discogs for an id that is not a Discogs one", () => {
    expect(discogsPageUrl("album", "mbid-1234")).toBe("https://www.discogs.com");
    expect(discogsPageUrl("album", undefined)).toBe("https://www.discogs.com");
  });

  it("searches Discogs like VinylKeeper did", () => {
    expect(discogsSearchUrl("kind of blue", false)).toBe(
      "https://www.discogs.com/search/?q=kind+of+blue&type=release&format=Vinyl");
    expect(discogsSearchUrl("coltrane", true)).toBe("https://www.discogs.com/search/?q=coltrane&type=artist");
  });

  it("opens a Discogs collection", () => {
    expect(discogsCollectionUrl("dj kent")).toBe("https://www.discogs.com/user/dj%20kent/collection");
  });
});
