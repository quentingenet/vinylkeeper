import { describe, it, expect } from "vitest";
import {
  importProgress,
  connectionOutcomeMessage,
  previewMessage,
  wantlistUnavailableReason,
  wantlistSummary,
  savedCopyName,
  summaryDetails,
  summaryWarnings,
} from "@components/Collections/discogsImportLabels";
import type { DiscogsImport } from "@models/IDiscogsImport";

const job = (overrides: Partial<DiscogsImport> = {}): DiscogsImport => ({
  id: 1,
  collection_id: 5,
  discogs_username: "kent",
  created_collection: true,
  saved_copy_collection_id: null,
  saved_copy_name: null,
  status: "running",
  pages_total: 0,
  pages_done: 0,
  items_total: 0,
  vinyl_found: 0,
  other_formats: 0,
  added: 0,
  copies_added: 0,
  already_in_collection: 0,
  other_pressings: 0,
  in_other_collections: 0,
  include_wantlist: false,
  phase: "collection",
  wantlist_items_total: 0,
  wantlist_vinyl_found: 0,
  wantlist_other_formats: 0,
  wantlist_added: 0,
  wantlist_already_in_wishlist: 0,
  wantlist_owned: 0,
  wantlist_other_pressings_owned: 0,
  wantlist_error: null,
  error_message: null,
  created_at: "2026-10-29T10:00:00Z",
  finished_at: null,
  ...overrides,
});

describe("importProgress", () => {
  it("has no value while the import waits or connects", () => {
    expect(importProgress(job({ status: "queued" }))).toEqual({
      label: "Waiting for another import to finish.",
      value: null,
    });
    expect(importProgress(job()).value).toBeNull();
  });

  it("fills the first half while reading the Discogs pages", () => {
    const progress = importProgress(job({ pages_total: 15, pages_done: 6 }));
    expect(progress.label).toBe("Reading your Discogs collection: page 6 of 15.");
    expect(progress.value).toBe(20);
  });

  it("fills the second half while adding the records", () => {
    const progress = importProgress(job({ pages_total: 2, pages_done: 2, vinyl_found: 200, added: 90, already_in_collection: 10 }));
    expect(progress.label).toBe("Adding records: 100 of 200.");
    expect(progress.value).toBe(75);
  });
});

describe("summary", () => {
  it("leaves the empty counters out", () => {
    expect(summaryDetails(job({ added: 3, copies_added: 3 }))).toEqual([]);
    expect(summaryWarnings(job({ added: 3 }))).toEqual([]);
  });

  it("lists copies, records already there and other formats", () => {
    expect(summaryDetails(job({ added: 3, copies_added: 4, already_in_collection: 2, other_formats: 1 }))).toEqual([
      "4 copies in all",
      "2 already in the collection",
      "1 other format skipped",
    ]);
  });

  it("warns about other pressings and records of other collections", () => {
    expect(summaryWarnings(job({ other_pressings: 1, in_other_collections: 12 }))).toEqual([
      "1 record is another pressing of a record you already had in this collection.",
      "12 records were already in another of your collections.",
    ]);
  });
});

describe("saved copy", () => {
  it("is named like the API names it", () => {
    expect(savedCopyName("Jazz shelf", new Date(2026, 9, 29))).toBe("SAVE Jazz shelf (2026-10-29)");
    expect(savedCopyName("Ska", new Date(2027, 0, 5))).toBe("SAVE Ska (2027-01-05)");
  });

  it("is recalled first in the summary", () => {
    expect(summaryWarnings(job({ saved_copy_name: "SAVE Jazz shelf (2026-10-29)", other_pressings: 1 }))[0]).toBe(
      "“SAVE Jazz shelf (2026-10-29)” is the save to restore this collection from: delete it once everything is fine."
    );
  });
});

describe("wantlist", () => {
  it("fills the second half of the bar while reading and adding the wantlist", () => {
    const reading = importProgress(job({ include_wantlist: true, phase: "wantlist", pages_total: 4, pages_done: 2 }));
    expect(reading).toEqual({ label: "Reading your Discogs wantlist: page 2 of 4.", value: 62.5 });

    const adding = importProgress(
      job({ include_wantlist: true, phase: "wantlist", pages_total: 1, pages_done: 1, wantlist_vinyl_found: 10,
        wantlist_added: 4, wantlist_owned: 1 })
    );
    expect(adding).toEqual({ label: "Adding to your wishlist: 5 of 10.", value: 87.5 });
  });

  it("fills the first half while the collection is read when the wantlist follows", () => {
    expect(importProgress(job({ include_wantlist: true, pages_total: 2, pages_done: 1 })).value).toBe(12.5);
  });

  it("sums up what went into the wishlist, by pressing", () => {
    expect(wantlistSummary(job())).toBeNull();
    expect(
      wantlistSummary(job({ include_wantlist: true, wantlist_added: 12, wantlist_already_in_wishlist: 3,
        wantlist_owned: 2, wantlist_other_formats: 1, wantlist_other_pressings_owned: 1 }))
    ).toEqual({
      text: "Wantlist: 12 records added to your wishlist (3 already there, 2 records you already own skipped, " +
        "1 other format skipped). 1 of them is another pressing of a record you own.",
      isError: false,
    });
  });

  it("says why the wantlist was not imported", () => {
    expect(wantlistSummary(job({ include_wantlist: true, wantlist_error: "Your Discogs wantlist is private." })))
      .toEqual({ text: "Wantlist not imported: Your Discogs wantlist is private.", isError: true });
  });
});

describe("preview", () => {
  const preview = (wantlist_items_total: number | null, wantlist_private = false) =>
    ({ discogs_username: "kent", items_total: 7, wantlist_items_total, wantlist_private });

  it("counts the wantlist only when it is imported too", () => {
    expect(previewMessage(preview(12), false)).toBe(
      "7 items found in your Discogs collection. Only the vinyl records will be imported.");
    expect(previewMessage(preview(12), true)).toBe(
      "7 items in your Discogs collection and 12 in its wantlist. Only the vinyl records will be imported.");
    expect(previewMessage(preview(null, true), true)).toBe(
      "7 items found in your Discogs collection. Only the vinyl records will be imported.");
  });

  it("says why the wantlist cannot be imported", () => {
    expect(wantlistUnavailableReason(preview(12))).toBeNull();
    expect(wantlistUnavailableReason(preview(null, true))).toMatch(/could not be read/);
    expect(wantlistUnavailableReason(preview(0))).toBe("Your Discogs wantlist is empty.");
    expect(wantlistUnavailableReason(preview(null))).toMatch(/could not be read/);
  });
});

describe("connectionOutcomeMessage", () => {
  it("says how the Discogs authorization ended", () => {
    expect(connectionOutcomeMessage(null)).toBeNull();
    expect(connectionOutcomeMessage("connected")?.severity).toBe("success");
    expect(connectionOutcomeMessage("denied")?.text).toMatch(/cancelled/);
    expect(connectionOutcomeMessage("expired")?.text).toMatch(/again/);
    expect(connectionOutcomeMessage("refused")?.text).toMatch(/could not connect/);
  });
});
