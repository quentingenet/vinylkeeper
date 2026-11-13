import { describe, it, expect } from "vitest";
import { isApiError, isSessionRefused } from "@utils/apiError";

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

describe("isSessionRefused", () => {
  it.each([
    [{ code: 401, message: "Session expired. Please log in again.", details: {} }],
    [{ code: 403, message: "Forbidden", details: {} }],
    [{ code: 1004, message: "Invalid refresh token", details: {} }],
    [{ code: 1009, message: "Refresh token not found", details: {} }],
    [{ code: 4004, message: "Invalid CSRF token", details: {} }],
  ])("is true for a refusal of the server: %j", (error) => {
    expect(isSessionRefused(error)).toBe(true);
  });

  it.each([
    [{ code: 9999, message: "Failed to fetch", details: {} }],
    [{ code: 5000, message: "Internal server error", details: {} }],
    [{ code: 502, message: "Bad gateway", details: {} }],
    [{ code: 4290, message: "Too many requests", details: {} }],
    [new Error("offline")],
    [null],
  ])("is false for a network or server failure: %j", (error) => {
    expect(isSessionRefused(error)).toBe(false);
  });
});
