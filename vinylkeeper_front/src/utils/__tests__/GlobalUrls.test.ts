import { describe, it, expect } from "vitest";
import { COMMUNITY_COLLECTIONS_URL, EGlobalUrls } from "@utils/GlobalUrls";

describe("GlobalUrls", () => {
  it("points the Community collections URL to the Collections page Community tab", () => {
    expect(COMMUNITY_COLLECTIONS_URL).toBe("/collections?tab=community");
  });

  it("keeps the legacy Explore URL for the redirect", () => {
    expect(EGlobalUrls.EXPLORE).toBe("/explore");
  });
});
