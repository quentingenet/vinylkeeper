import { describe, it, expect } from "vitest";
import { isApiError, toApiError } from "@utils/apiError";

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

describe("toApiError", () => {
  it("passes through an already well-formed ApiError unchanged", () => {
    const original = { code: 403, message: "Forbidden", details: { field: "x" } };
    expect(toApiError(original)).toBe(original);
  });

  it("wraps a native Error using its message", () => {
    const result = toApiError(new Error("network down"));
    expect(result).toEqual({ code: 9999, message: "network down", details: {} });
  });

  it("falls back to a generic message for non-Error, non-ApiError values", () => {
    expect(toApiError("just a string")).toEqual({
      code: 9999,
      message: "Unknown error occurred",
      details: {},
    });
    expect(toApiError(null)).toEqual({
      code: 9999,
      message: "Unknown error occurred",
      details: {},
    });
  });
});
