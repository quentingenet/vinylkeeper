import { describe, it, expect } from "vitest";
import { releasedLabel } from "@components/Records/pressingMarks";

describe("releasedLabel", () => {
  it.each([
    ["2013-05-17", "17 May 2013"],
    ["1972-05", "May 1972"],
    ["1972", "1972"],
  ])("shows %s as %s", (released, expected) => {
    expect(releasedLabel(released)).toBe(expected);
  });

  it("gives nothing for an unknown date", () => {
    expect(releasedLabel(null)).toBeNull();
  });
});
