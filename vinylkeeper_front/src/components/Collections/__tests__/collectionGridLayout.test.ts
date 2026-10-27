import { describe, it, expect } from "vitest";
import { createTheme } from "@mui/material";
import { collectionGridDesktopWidth } from "@components/Collections/collectionGridLayout";

describe("collectionGridDesktopWidth", () => {
  it("matches 3 cards with their margins plus 2 gaps of 32px", () => {
    expect(collectionGridDesktopWidth(createTheme())).toBe("calc(3 * (320px + 16px) + 64px)");
  });
});
