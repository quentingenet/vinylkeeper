import { describe, it, expect } from "vitest";
import { parseCollectionId, parseShareToken, retryCollection, unavailableReason } from "@utils/collectionAvailability";
import { safeNextPath, registerUrl } from "@utils/GlobalUrls";

describe("unavailableReason", () => {
  it("tells private from deleted, and both from a failure", () => {
    expect(unavailableReason({ code: 4003, message: "private" })).toBe("private");
    expect(unavailableReason({ code: 2000, message: "not found" })).toBe("gone");
    expect(unavailableReason({ code: 5000, message: "server" })).toBe("error");
    expect(unavailableReason(new Error("network"))).toBe("error");
  });
});

describe("parseCollectionId", () => {
  it("only takes what can be an id", () => {
    expect(parseCollectionId("12")).toBe(12);
    expect(parseCollectionId("abc")).toBeNull();
    expect(parseCollectionId("0")).toBeNull();
    expect(parseCollectionId("-3")).toBeNull();
    expect(parseCollectionId("99999999999")).toBeNull();
    expect(parseCollectionId(undefined)).toBeNull();
  });
});

describe("parseShareToken", () => {
  it("only takes the key of a link, never an id", () => {
    expect(parseShareToken("0123456789abcdef0123456789abcdef")).toBe("0123456789abcdef0123456789abcdef");
    expect(parseShareToken("174")).toBeNull();
    expect(parseShareToken("0123456789ABCDEF0123456789ABCDEF")).toBeNull();
    expect(parseShareToken(undefined)).toBeNull();
  });
});

describe("retryCollection", () => {
  it("does not ask twice for a clear answer", () => {
    expect(retryCollection(0, { code: 4003, message: "private" })).toBe(false);
    expect(retryCollection(0, new Error("network"))).toBe(true);
    expect(retryCollection(1, new Error("network"))).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps the paths of the site only", () => {
    expect(safeNextPath("/collections/12")).toBe("/collections/12");
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });

  it("travels in the link of the form", () => {
    expect(registerUrl("/shared/abc")).toBe("/?auth=register&next=%2Fshared%2Fabc");
  });
});
