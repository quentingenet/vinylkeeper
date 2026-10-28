import { describe, it, expect } from "vitest";
import {
  buildFindPressingUrl,
  collectionDetailsUrl,
  parseInitialQuery,
  parseReplaceTarget,
} from "@utils/findPressing";

const paramsOf = (url: string) => new URLSearchParams(url.split("?")[1]);

describe("findPressing", () => {
  it("round-trips the album to replace through the add vinyls URL", () => {
    const url = buildFindPressingUrl({ collectionId: 7, albumId: 10, title: "Brel - Brel & Co" });

    expect(url.startsWith("/add-vinyls?")).toBe(true);
    expect(parseReplaceTarget(paramsOf(url))).toEqual({ collectionId: 7, albumId: 10, title: "Brel - Brel & Co" });
    expect(parseInitialQuery(paramsOf(url))).toBe("Brel - Brel & Co");
  });

  it.each(["", "q=Brel", "q=Brel&replaceCollection=7", "replaceCollection=abc&replaceAlbum=10",
    "replaceCollection=-1&replaceAlbum=10"])("is not a replacement for %s", (query) => {
    expect(parseReplaceTarget(new URLSearchParams(query))).toBeNull();
  });

  it("builds the collection page URL", () => {
    expect(collectionDetailsUrl(7)).toBe("/collections/7");
  });
});
