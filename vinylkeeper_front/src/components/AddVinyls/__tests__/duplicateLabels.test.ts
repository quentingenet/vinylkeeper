import { describe, it, expect } from "vitest";
import { duplicatePrompt, ownedHint, pressingSummary } from "@components/AddVinyls/duplicateLabels";
import type { OwnedPressing } from "@models/IExternalReference";

const owned = (overrides: Partial<OwnedPressing>): OwnedPressing => ({
  collection_id: 7,
  collection_name: "Jazz shelf",
  album_id: 1,
  external_album_id: "2252871",
  same_release: false,
  pressing_confirmed: true,
  copies_count: 1,
  release_year: 1959,
  country: "US",
  label: "Columbia",
  catno: "CL 1355",
  formats: ["LP", "Mono"],
  ...overrides,
});

describe("duplicatePrompt", () => {
  it("is nothing when the collection does not hold the record", () => {
    expect(duplicatePrompt([owned({ collection_id: 8 })], 7)).toBeNull();
  });

  it("offers another copy of the same release", () => {
    const prompt = duplicatePrompt([owned({ same_release: true, copies_count: 2 })], 7);

    expect(prompt).toEqual({
      collectionId: 7,
      addCopy: true,
      message: "You already have this pressing in Jazz shelf (×2). Add another copy?",
      confirmLabel: "Add another copy",
    });
  });

  it("names the confirmed pressing already owned", () => {
    const prompt = duplicatePrompt([owned({})], 7);

    expect(prompt?.addCopy).toBe(false);
    expect(prompt?.message).toBe(
      "You already have another pressing of this record in Jazz shelf (1959, US, Columbia CL 1355). " +
        "Add this pressing too?"
    );
  });

  it("does not state an unconfirmed pressing as the user's", () => {
    const prompt = duplicatePrompt([owned({ pressing_confirmed: false })], 7);

    expect(prompt?.message).toBe("You already have another pressing of this record in Jazz shelf. Add this pressing too?");
  });

  it("counts several other pressings", () => {
    const prompt = duplicatePrompt([owned({}), owned({ album_id: 2, pressing_confirmed: false })], 7);

    expect(prompt?.message).toContain("2 other pressings of this record");
  });
});

describe("pressingSummary", () => {
  it("skips what is unknown", () => {
    expect(pressingSummary(owned({ release_year: null, label: null }))).toBe("US, CL 1355");
  });
});

describe("ownedHint", () => {
  it("tells which collections already hold the record", () => {
    const list = [owned({ same_release: true }), owned({ collection_id: 8 })];

    expect(ownedHint(list, 7)).toBe("You have this pressing here");
    expect(ownedHint(list, 8)).toBe("You have another pressing here");
    expect(ownedHint(list, 9)).toBeNull();
  });
});
