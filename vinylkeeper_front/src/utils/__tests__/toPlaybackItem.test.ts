import { describe, it, expect } from "vitest";
import { searchResultToPlaybackItem, toPlaybackItem } from "@utils/toPlaybackItem";
import type { DiscogsData } from "@models/IRequestProxy";
import type { LatestAddition } from "@models/IDashboardStats";

function makeAddition(overrides: Partial<LatestAddition> = {}): LatestAddition {
  return {
    id: 1,
    name: "Daft Punk - Discovery",
    username: "jane",
    created_at: "2024-06-15T12:00:00Z",
    type: "album",
    image_url: "https://example.com/cover.jpg",
    external_id: "123456",
    ...overrides,
  };
}

describe("toPlaybackItem", () => {
  describe("album", () => {
    it("extracts the artist name from the 'Artist - Title' convention", () => {
      const item = toPlaybackItem(makeAddition(), "album");

      expect(item).not.toBeNull();
      expect(item?.artist).toBe("Daft Punk");
      expect(item?.title).toBe("Daft Punk - Discovery");
    });

    it("falls back to the full name as artist when there is no separator (matches MediaCard's convention)", () => {
      const item = toPlaybackItem(
        makeAddition({ name: "Discovery" }),
        "album"
      );

      expect(item?.artist).toBe("Discovery");
      expect(item?.title).toBe("Discovery");
    });

    it("only splits on the first separator", () => {
      const item = toPlaybackItem(
        makeAddition({ name: "A - B - C" }),
        "album"
      );

      expect(item?.artist).toBe("A");
      expect(item?.title).toBe("A - B - C");
    });
  });

  describe("artist", () => {
    it("uses the full name as artist, unaffected by the album fix", () => {
      const item = toPlaybackItem(
        makeAddition({ name: "Daft Punk", type: "artist" }),
        "artist"
      );

      expect(item?.artist).toBe("Daft Punk");
      expect(item?.title).toBe("Daft Punk");
    });
  });

  describe("common behavior", () => {
    it("returns null when addition is undefined", () => {
      expect(toPlaybackItem(undefined, "album")).toBeNull();
    });

    it("returns null and does not throw for a non-numeric external_id", () => {
      const item = toPlaybackItem(
        makeAddition({ external_id: "abc-not-a-discogs-id" }),
        "album"
      );

      expect(item).toBeNull();
    });

    it("falls back to the numeric internal id when external_id is missing", () => {
      const item = toPlaybackItem(
        makeAddition({ external_id: undefined, id: 42 }),
        "album"
      );

      expect(item?.id).toBe("42");
    });

    it("carries the image_url and itemType through unchanged", () => {
      const item = toPlaybackItem(makeAddition(), "album");

      expect(item?.image_url).toBe("https://example.com/cover.jpg");
      expect(item?.itemType).toBe("album");
    });
  });
});

describe("searchResultToPlaybackItem", () => {
  it("takes the artist of an album from its name, as the API sends it", () => {
    const hit = {
      uuid: "u", id: "249504", title: "Miles Davis - Kind Of Blue", picture: "cover.jpg",
      artist: { uuid: "a", id: "", name: "Miles Davis" },
    } as DiscogsData;

    expect(searchResultToPlaybackItem(hit, false)).toEqual({
      id: "249504", title: "Miles Davis - Kind Of Blue", artist: "Miles Davis", image_url: "cover.jpg", itemType: "album",
    });
  });

  it("uses the name of an artist for both title and artist", () => {
    const hit = { uuid: "u", id: "23755", name: "Miles Davis" } as DiscogsData;

    expect(searchResultToPlaybackItem(hit, true)).toEqual({
      id: "23755", title: "Miles Davis", artist: "Miles Davis", image_url: "", itemType: "artist",
    });
  });
});
