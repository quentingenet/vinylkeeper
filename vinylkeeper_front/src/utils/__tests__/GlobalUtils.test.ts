import { describe, it, expect } from "vitest";
import { truncateText } from "@utils/GlobalUtils";

describe("truncateText", () => {
  it("leaves short text unchanged", () => {
    expect(truncateText("Discovery", 20)).toBe("Discovery");
  });

  it("truncates text longer than maxLength and appends an ellipsis", () => {
    expect(truncateText("A very long album title indeed", 10)).toBe(
      "A very lon..."
    );
  });

  it("leaves text exactly at maxLength unchanged (boundary)", () => {
    expect(truncateText("1234567890", 10)).toBe("1234567890");
  });

  it("truncates text one character over maxLength", () => {
    expect(truncateText("12345678901", 10)).toBe("1234567890...");
  });

  it("handles an empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });
});
