import { describe, it, expect } from "vitest";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";

const DISCOGS_SRC = "https://i.discogs.com/abc123/cover.jpg";

function paramsOf(url: string): URLSearchParams {
  return new URLSearchParams(url.split("?")[1] ?? "");
}

describe("buildProxyImageUrl", () => {
  it("rejects an empty source", () => {
    expect(buildProxyImageUrl("", 300, 300)).toBe("");
  });

  it("rejects a whitespace-only source", () => {
    expect(buildProxyImageUrl("   ", 300, 300)).toBe("");
  });

  it("rejects a source that is not from i.discogs.com", () => {
    expect(
      buildProxyImageUrl("https://evil.example.com/cover.jpg", 300, 300)
    ).toBe("");
  });

  it("builds a proxy URL for a valid Discogs image source", () => {
    const url = buildProxyImageUrl(DISCOGS_SRC, 300, 300);

    expect(url).toContain("/images/proxy?");
    const params = paramsOf(url);
    expect(params.get("src")).toBe(DISCOGS_SRC);
    expect(params.get("w")).toBe("300");
    expect(params.get("h")).toBe("300");
    expect(params.get("q")).toBe("85"); // default quality
    expect(params.has("cache")).toBe(false);
  });

  it("trims whitespace around the source URL", () => {
    const url = buildProxyImageUrl(`  ${DISCOGS_SRC}  `, 100, 100);
    expect(paramsOf(url).get("src")).toBe(DISCOGS_SRC);
  });

  it("honors an explicit quality value", () => {
    const url = buildProxyImageUrl(DISCOGS_SRC, 100, 100, 60);
    expect(paramsOf(url).get("q")).toBe("60");
  });

  it("sets cache=true only when cacheable is true", () => {
    const url = buildProxyImageUrl(DISCOGS_SRC, 100, 100, 85, true);
    expect(paramsOf(url).get("cache")).toBe("true");
  });
});
