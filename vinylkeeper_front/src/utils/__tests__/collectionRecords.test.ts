import { describe, it, expect } from "vitest";
import { groupIntoRecords, pressingTitle, storedEdition, toRecordCard, workKey } from "@utils/collectionRecords";
import type { CollectionAlbumResponse } from "@models/Collection";

const album = (id: number, overrides: Partial<CollectionAlbumResponse> = {}): CollectionAlbumResponse => ({
  id,
  external_album_id: String(id),
  title: `Album ${id}`,
  created_at: `2024-01-0${id}T00:00:00Z`,
  updated_at: `2024-01-0${id}T00:00:00Z`,
  collections_count: 1,
  loans_count: 0,
  wishlist_count: 0,
  copies_count: 1,
  ...overrides,
} as CollectionAlbumResponse);

describe("workKey", () => {
  it("is the master, or the album itself without one", () => {
    expect(workKey(album(1, { external_master_id: "5460" }))).toBe("5460");
    expect(workKey(album(2))).toBe("release:2");
  });
});

describe("groupIntoRecords", () => {
  it("gathers the pressings of a work, first added first, and counts every copy", () => {
    const reissue = album(3, { external_master_id: "5460", copies_count: 2 });
    const original = album(1, { external_master_id: "5460" });
    const other = album(2);

    const records = groupIntoRecords([reissue, other, original]);

    expect(records.map((r) => r.work_key)).toEqual(["5460", "release:2"]);
    expect(records[0].pressings.map((p) => p.id)).toEqual([1, 3]);
    expect(records[0].title).toBe("Album 1");
    expect(records[0].copies_count).toBe(3);
  });
});

describe("toRecordCard", () => {
  it("stands for the work with its first pressing and all its copies", () => {
    const [record] = groupIntoRecords([album(1, { external_master_id: "9" }), album(2, { external_master_id: "9" })]);

    const card = toRecordCard(record);

    expect(card.copies_count).toBe(2);
    expect(card.id).toBe(1);
    expect(card.record.pressings_count).toBe(2);
  });
});

describe("pressingTitle", () => {
  it("names the pressing by its stored details, or by its place", () => {
    const known = album(1, { release_year: 1959, country: "US", label: "Columbia", catno: "CL 1355", formats: ["LP"] });

    expect(pressingTitle(known, 1)).toBe("1959, US, Columbia CL 1355");
    expect(pressingTitle(album(2), 2)).toBe("Pressing 2");
    expect(storedEdition(known).year).toBe("1959");
  });
});
