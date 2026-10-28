import { describe, it, expect } from "vitest";
import {
  parseInitialQuery,
  parseReplaceTarget,
} from "@utils/findPressing";

const paramsOf = (url: string) => new URLSearchParams(url.split("?")[1]);

describe("findPressing", () => {
  it("reads the album to replace from an add vinyls link", () => {
    const url = "/add-vinyls?q=Brel+-+Brel+%26+Co&replaceCollection=7&replaceAlbum=10";

    expect(parseReplaceTarget(paramsOf(url))).toEqual({ collectionId: 7, albumId: 10, title: "Brel - Brel & Co" });
    expect(parseInitialQuery(paramsOf(url))).toBe("Brel - Brel & Co");
  });

  it.each(["", "q=Brel", "q=Brel&replaceCollection=7", "replaceCollection=abc&replaceAlbum=10",
    "replaceCollection=-1&replaceAlbum=10"])("is not a replacement for %s", (query) => {
    expect(parseReplaceTarget(new URLSearchParams(query))).toBeNull();
  });
});
