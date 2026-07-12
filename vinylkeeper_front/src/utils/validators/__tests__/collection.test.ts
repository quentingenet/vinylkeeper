import { describe, it, expect } from "vitest";
import { collectionValidationSchema } from "@utils/validators/collection";

function validData(overrides: Record<string, unknown> = {}) {
  return {
    name: "My Collection",
    is_public: true,
    ...overrides,
  };
}

describe("collectionValidationSchema", () => {
  it("accepts minimal valid data", async () => {
    await expect(
      collectionValidationSchema.validate(validData())
    ).resolves.toBeTruthy();
  });

  it("rejects an empty name", async () => {
    await expect(
      collectionValidationSchema.validate(validData({ name: "" }))
    ).rejects.toThrow();
  });

  it("rejects a whitespace-only name", async () => {
    await expect(
      collectionValidationSchema.validate(validData({ name: "   " }))
    ).rejects.toThrow(/cannot be empty/i);
  });

  it("rejects a name longer than 255 characters", async () => {
    await expect(
      collectionValidationSchema.validate(
        validData({ name: "a".repeat(256) })
      )
    ).rejects.toThrow();
  });

  it("rejects a description longer than 255 characters", async () => {
    await expect(
      collectionValidationSchema.validate(
        validData({ description: "a".repeat(256) })
      )
    ).rejects.toThrow();
  });

  it("rejects when is_public is missing", async () => {
    await expect(
      collectionValidationSchema.validate({ name: "My Collection" })
    ).rejects.toThrow();
  });

  it("rejects a negative album id", async () => {
    await expect(
      collectionValidationSchema.validate(
        validData({ album_ids: [1, -2] })
      )
    ).rejects.toThrow();
  });
});
