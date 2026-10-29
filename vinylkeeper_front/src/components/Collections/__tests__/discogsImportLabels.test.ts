import { describe, it, expect } from "vitest";
import {
  importProgress,
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
