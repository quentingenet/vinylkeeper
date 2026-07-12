import { describe, it, expect } from "vitest";
import { getVisiblePages } from "@utils/getVisiblePages";

describe("getVisiblePages", () => {
  describe("when count fits within maxVisiblePages", () => {
    it("returns every page, no ellipsis (desktop)", () => {
      expect(getVisiblePages(4, 1, 4, false)).toEqual([1, 2, 3, 4]);
    });

    it("returns every page, no ellipsis (mobile)", () => {
      expect(getVisiblePages(3, 2, 3, true)).toEqual([1, 2, 3]);
    });

    it("handles a single page", () => {
      expect(getVisiblePages(1, 1, 4, false)).toEqual([1]);
    });
  });

  describe("desktop (maxVisiblePages=4, delta=2)", () => {
    it("shows no leading ellipsis near the first page", () => {
      expect(getVisiblePages(10, 1, 4, false)).toEqual([1, 2, 3, "...", 10]);
    });

    it("shows both ellipses in the middle", () => {
      expect(getVisiblePages(10, 5, 4, false)).toEqual([
        1, "...", 3, 4, 5, 6, 7, "...", 10,
      ]);
    });

    it("shows no trailing ellipsis near the last page", () => {
      expect(getVisiblePages(10, 10, 4, false)).toEqual([
        1, "...", 8, 9, 10,
      ]);
    });

    it("never shows an ellipsis that would only skip a single page", () => {
      // count=5 > maxVisiblePages=4, but the full range already reaches
      // both ends around the middle page — no gap left to collapse.
      expect(getVisiblePages(5, 3, 4, false)).toEqual([1, 2, 3, 4, 5]);
    });

    it("always includes the first and last page", () => {
      for (let page = 1; page <= 10; page++) {
        const pages = getVisiblePages(10, page, 4, false);
        expect(pages[0]).toBe(1);
        expect(pages[pages.length - 1]).toBe(10);
      }
    });
  });

  describe("mobile (maxVisiblePages=3)", () => {
    it("shows the first pages with a trailing ellipsis near the start", () => {
      expect(getVisiblePages(10, 1, 3, true)).toEqual([1, 2, 3, "...", 10]);
      expect(getVisiblePages(10, 2, 3, true)).toEqual([1, 2, 3, "...", 10]);
    });

    it("shows the last pages with a leading ellipsis near the end", () => {
      expect(getVisiblePages(10, 9, 3, true)).toEqual([1, "...", 8, 9, 10]);
      expect(getVisiblePages(10, 10, 3, true)).toEqual([1, "...", 8, 9, 10]);
    });

    it("shows the current page surrounded by ellipses in the middle", () => {
      expect(getVisiblePages(10, 5, 3, true)).toEqual([1, "...", 5, "...", 10]);
    });
  });
});
