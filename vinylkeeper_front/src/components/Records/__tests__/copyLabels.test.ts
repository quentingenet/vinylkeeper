import { describe, it, expect } from "vitest";
import { copyDatesCaption } from "@components/Records/copyLabels";

describe("copyDatesCaption", () => {
  it("gives the day the copy was added", () => {
    expect(copyDatesCaption({ created_at: "2026-10-12T10:00:00Z" })).toBe("Added on 12 Oct 2026");
  });

  it("leaves out an update made the same day", () => {
    expect(copyDatesCaption({ created_at: "2026-10-12T10:00:00Z", updated_at: "2026-10-12T10:05:00Z" })).toBe(
      "Added on 12 Oct 2026"
    );
  });

  it("adds the day of a later change", () => {
    expect(copyDatesCaption({ created_at: "2026-10-12T10:00:00Z", updated_at: "2026-10-20T10:00:00Z" })).toBe(
      "Added on 12 Oct 2026, updated on 20 Oct 2026"
    );
  });
});
