import { describe, it, expect } from "vitest";
import { extractFilenameFromContentDisposition } from "@utils/DownloadUtils";

describe("extractFilenameFromContentDisposition", () => {
  it("returns null for a null header", () => {
    expect(extractFilenameFromContentDisposition(null)).toBeNull();
  });

  it("returns null for an empty header", () => {
    expect(extractFilenameFromContentDisposition("")).toBeNull();
  });

  it("returns null when there is no filename directive", () => {
    expect(extractFilenameFromContentDisposition("attachment")).toBeNull();
  });

  it("extracts a quoted filename", () => {
    expect(
      extractFilenameFromContentDisposition(
        'attachment; filename="my collection.csv"'
      )
    ).toBe("my collection.csv");
  });

  it("extracts an unquoted filename", () => {
    expect(
      extractFilenameFromContentDisposition("attachment; filename=export.csv")
    ).toBe("export.csv");
  });

  it("extracts and decodes a UTF-8 encoded filename (RFC 5987)", () => {
    expect(
      extractFilenameFromContentDisposition(
        "attachment; filename*=UTF-8''ma%20collection.csv"
      )
    ).toBe("ma collection.csv");
  });

  it("prefers the UTF-8 form when both filename* and filename are present", () => {
    expect(
      extractFilenameFromContentDisposition(
        'attachment; filename="fallback.csv"; filename*=UTF-8\'\'preferred.csv'
      )
    ).toBe("preferred.csv");
  });

  it("falls back to the raw value when URI decoding fails", () => {
    expect(
      extractFilenameFromContentDisposition("attachment; filename*=UTF-8''%")
    ).toBe("%");
  });
});
