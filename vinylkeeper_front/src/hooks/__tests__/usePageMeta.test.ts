import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageMeta, SITE_URL } from "@hooks/usePageMeta";

const content = (name: string) => document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content");
const canonical = () => document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");

describe("usePageMeta", () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta name="description" content="Home"><meta name="robots" content="index, follow">';
    document.title = "Vinyl Keeper";
  });

  it("gives the page its title, description and canonical URL", () => {
    renderHook(() =>
      usePageMeta({ title: "Vinyl Atlas", description: "Record shops", canonicalPath: "/atlas" })
    );

    expect(document.title).toBe("Vinyl Atlas");
    expect(content("description")).toBe("Record shops");
    expect(canonical()).toBe(`${SITE_URL}/atlas`);
  });

  it("points the home page to the site root", () => {
    renderHook(() => usePageMeta({ canonicalPath: "/" }));
    expect(canonical()).toBe(SITE_URL);
  });

  it("keeps an email link page out of search engines", () => {
    renderHook(() => usePageMeta({ noIndex: true }));
    expect(content("robots")).toBe("noindex, nofollow");
  });

  it("puts everything back when the page is left", () => {
    const { unmount } = renderHook(() =>
      usePageMeta({ title: "Vinyl Atlas", description: "Record shops", canonicalPath: "/atlas", noIndex: true })
    );

    unmount();

    expect(document.title).toBe("Vinyl Keeper");
    expect(content("description")).toBe("Home");
    expect(content("robots")).toBe("index, follow");
    expect(canonical()).toBeUndefined();
  });
});
