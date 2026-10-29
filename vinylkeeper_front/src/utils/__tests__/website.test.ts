import { describe, it, expect } from "vitest";
import { safeWebsiteUrl, websiteLabel } from "@utils/website";

describe("safeWebsiteUrl", () => {
  it.each([
    ["https://www.sofarecords.fr/shop", "https://www.sofarecords.fr/shop"],
    ["http://lebonson.fr", "http://lebonson.fr/"],
    ["  https://example.com  ", "https://example.com/"],
  ])("keeps a web address: %s", (url, expected) => {
    expect(safeWebsiteUrl(url)).toBe(expected);
  });

  it.each(["javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://example.com", "not a url", "", null, undefined])(
    "drops anything else: %s",
    (url) => {
      expect(safeWebsiteUrl(url)).toBeNull();
    }
  );
});

describe("websiteLabel", () => {
  it("shows the domain without www", () => {
    expect(websiteLabel("https://www.sofarecords.fr/shop?ref=1")).toBe("sofarecords.fr");
    expect(websiteLabel("http://lebonson.fr/")).toBe("lebonson.fr");
  });
});
