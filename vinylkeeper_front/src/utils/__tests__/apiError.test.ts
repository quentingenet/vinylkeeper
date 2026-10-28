import { describe, it, expect } from "vitest";
import { isApiError } from "@utils/apiError";

describe("isApiError", () => {
  it("returns true for a well-formed ApiError", () => {
    expect(
      isApiError({ code: 404, message: "Not found", details: {} })
    ).toBe(true);
  });

  it("returns true even without a details field", () => {
    expect(isApiError({ code: 500, message: "Server error" })).toBe(true);
  });

  it.each([
    [null],
    [undefined],
    ["a string"],
    [42],
    [{ message: "missing code" }],
    [{ code: 404 }],
    [{ code: "404", message: "code is a string, not a number" }],
    [{ code: 404, message: 123 }],
  ])("returns false for %j", (value) => {
    expect(isApiError(value)).toBe(false);
  });
});
