import { describe, it, expect } from "vitest";
import { loginValidationSchema } from "@utils/validators/loginValidationSchema";

describe("loginValidationSchema", () => {
  it("accepts a valid email and password", async () => {
    await expect(
      loginValidationSchema.validate({
        email: "jane@example.com",
        password: "anything",
      })
    ).resolves.toBeTruthy();
  });

  it("rejects an invalid email", async () => {
    await expect(
      loginValidationSchema.validate({
        email: "not-an-email",
        password: "anything",
      })
    ).rejects.toThrow();
  });

  it("rejects a missing password", async () => {
    await expect(
      loginValidationSchema.validate({
        email: "jane@example.com",
        password: "",
      })
    ).rejects.toThrow();
  });

  it("accepts an email at a subdomain", async () => {
    await expect(
      loginValidationSchema.validate({
        email: "jane@mail.example.io",
        password: "anything",
      })
    ).resolves.toBeTruthy();
  });
});
