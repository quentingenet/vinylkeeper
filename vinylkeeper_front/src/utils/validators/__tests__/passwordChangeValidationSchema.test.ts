import { describe, it, expect } from "vitest";
import { passwordChangeValidationSchema } from "@utils/validators/passwordChangeValidationSchema";

function validData(overrides: Record<string, unknown> = {}) {
  return {
    currentPassword: "oldpass1",
    newPassword: "newpass1",
    confirmPassword: "newpass1",
    ...overrides,
  };
}

describe("passwordChangeValidationSchema", () => {
  it("accepts fully valid data", async () => {
    await expect(
      passwordChangeValidationSchema.validate(validData())
    ).resolves.toBeTruthy();
  });

  it("rejects when confirmPassword does not match newPassword", async () => {
    await expect(
      passwordChangeValidationSchema.validate(
        validData({ confirmPassword: "somethingelse1" })
      )
    ).rejects.toThrow(/same as the new password/i);
  });

  it("rejects a missing currentPassword", async () => {
    await expect(
      passwordChangeValidationSchema.validate(
        validData({ currentPassword: "" })
      )
    ).rejects.toThrow();
  });

  it("rejects a newPassword without a number", async () => {
    await expect(
      passwordChangeValidationSchema.validate(
        validData({ newPassword: "abcdefgh", confirmPassword: "abcdefgh" })
      )
    ).rejects.toThrow();
  });
});
