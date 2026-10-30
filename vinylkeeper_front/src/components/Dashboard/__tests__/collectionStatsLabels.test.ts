import { describe, it, expect } from "vitest";
import { OTHERS_LABEL, percentOf, topWithOthers } from "@components/Dashboard/collectionStatsLabels";

describe("topWithOthers", () => {
  it("keeps every entry under the limit", () => {
    expect(topWithOthers([{ label: "Jazz", count: 3 }], 3)).toEqual([{ label: "Jazz", count: 3 }]);
  });

  it("sums the rest in one Others bar that leads nowhere", () => {
    const entries = ["A", "B", "C", "D"].map((label, i) => ({ label, count: 4 - i }));

    expect(topWithOthers(entries, 3)).toEqual([
      { label: "A", count: 4 },
      { label: "B", count: 3 },
      { label: OTHERS_LABEL, count: 3, disabled: true },
    ]);
  });
});

describe("percentOf", () => {
  it("rounds and survives an empty total", () => {
    expect(percentOf(1, 3)).toBe("33%");
    expect(percentOf(0, 0)).toBe("0%");
  });
});
