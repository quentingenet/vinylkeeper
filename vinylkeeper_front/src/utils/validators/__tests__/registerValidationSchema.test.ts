import { describe, it, expect } from "vitest";
import { registerValidationSchema } from "@utils/validators/registerValidationSchema";

function validData(overrides: Record<string, unknown> = {}) {
  return {
    username: "jane.doe",
    email: "jane@example.com",
    isAcceptedTerms: true,
    password: "abcd1234",
    passwordBis: "abcd1234",
    timezone: "Europe/Paris",
    ...overrides,
  };
}

describe("registerValidationSchema", () => {
  it("accepts fully valid data", async () => {
    await expect(
      registerValidationSchema.validate(validData())
    ).resolves.toBeTruthy();
  });

  it("rejects when passwordBis does not match password", async () => {
    await expect(
      registerValidationSchema.validate(
        validData({ passwordBis: "different1234" })
      )
    ).rejects.toThrow(/same as the password/i);
  });

  it("rejects when terms are not accepted", async () => {
    await expect(
      registerValidationSchema.validate(validData({ isAcceptedTerms: false }))
    ).rejects.toThrow();
  });

  it("rejects a username with uppercase letters", async () => {
    await expect(
      registerValidationSchema.validate(validData({ username: "Jane.Doe" }))
    ).rejects.toThrow();
  });

  it("rejects a username starting with a hyphen", async () => {
    await expect(
      registerValidationSchema.validate(validData({ username: "-jane" }))
    ).rejects.toThrow();
  });

  it("rejects a username ending with an underscore", async () => {
    await expect(
      registerValidationSchema.validate(validData({ username: "jane_" }))
    ).rejects.toThrow();
  });

  it("accepts a 2-character username", async () => {
    await expect(
      registerValidationSchema.validate(validData({ username: "jd" }))
    ).resolves.toBeTruthy();
  });

  it("rejects a password without a letter", async () => {
    await expect(
      registerValidationSchema.validate(
        validData({ password: "12345678", passwordBis: "12345678" })
      )
    ).rejects.toThrow();
  });

  it("rejects a password without a number", async () => {
    await expect(
      registerValidationSchema.validate(
        validData({ password: "abcdefgh", passwordBis: "abcdefgh" })
      )
    ).rejects.toThrow();
  });

  it("rejects a password shorter than 4 characters", async () => {
    await expect(
      registerValidationSchema.validate(
        validData({ password: "a1", passwordBis: "a1" })
      )
    ).rejects.toThrow();
  });

  it("rejects an invalid email", async () => {
    await expect(
      registerValidationSchema.validate(validData({ email: "not-an-email" }))
    ).rejects.toThrow();
  });
});
