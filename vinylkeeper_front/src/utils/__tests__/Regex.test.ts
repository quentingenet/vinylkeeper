import { describe, it, expect } from "vitest";
import {
  emailValidator,
  passwordAtLeast8,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";

describe("emailValidator", () => {
  it.each([
    "user@example.com",
    "user.name+tag@example.co",
    "user_name@sub.example.io",
  ])("accepts a valid email: %s", (email) => {
    expect(emailValidator.test(email)).toBe(true);
  });

  it.each(["not-an-email", "user@", "@example.com", "user@example", "user example.com"])(
    "rejects an invalid email: %s",
    (email) => {
      expect(emailValidator.test(email)).toBe(false);
    }
  );

  it("accepts TLDs longer than 6 characters", () => {
    expect(emailValidator.test("user@example.technology")).toBe(true);
    expect(emailValidator.test("user@example.international")).toBe(true);
  });
});

describe("passwordAtLeast8", () => {
  it("accepts an 8-character string", () => {
    expect(passwordAtLeast8.test("abcdef12")).toBe(true);
  });

  it("rejects a 7-character string", () => {
    expect(passwordAtLeast8.test("abcdef1")).toBe(false);
  });

  it("does not forbid symbols, spaces nor accents", () => {
    expect(passwordAtLeast8.test("p@ss w0rd!")).toBe(true);
    expect(passwordAtLeast8.test("été-2026-Ça")).toBe(true);
  });
});

describe("passwordWithLetter (accents included, as in the API)", () => {
  it("accepts a password whose only letters are accented", () => {
    expect(passwordWithLetter.test("éèàç1234")).toBe(true);
  });

  it("rejects digits and symbols only", () => {
    expect(passwordWithLetter.test("1234!@#$")).toBe(false);
  });
});

describe("passwordWithLetter", () => {
  it("accepts a string containing a letter", () => {
    expect(passwordWithLetter.test("1234a")).toBe(true);
  });

  it("rejects a string with only digits", () => {
    expect(passwordWithLetter.test("12345")).toBe(false);
  });
});

describe("passwordWithNumber", () => {
  it("accepts a string containing a digit", () => {
    expect(passwordWithNumber.test("abc1")).toBe(true);
  });

  it("rejects a string with only letters", () => {
    expect(passwordWithNumber.test("abcde")).toBe(false);
  });
});
