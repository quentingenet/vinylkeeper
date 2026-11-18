import { describe, it, expect } from "vitest";
import { canReportCollection } from "@components/Collections/collectionReportRules";

const others = { isLoggedIn: true, currentUserUuid: "me", ownerUuid: "bob", isPublic: true };

describe("canReportCollection", () => {
  it("offers the report on a public collection of someone else, to a member", () => {
    expect(canReportCollection(others)).toBe(true);
  });

  it("never on one's own collection, a private one, or to a visitor", () => {
    expect(canReportCollection({ ...others, ownerUuid: "me" })).toBe(false);
    expect(canReportCollection({ ...others, isPublic: false })).toBe(false);
    expect(canReportCollection({ ...others, isLoggedIn: false })).toBe(false);
    // Unknown ids are not the same person, but an unknown member cannot report
    expect(canReportCollection({ ...others, currentUserUuid: undefined, ownerUuid: undefined })).toBe(false);
  });
});
