import type { CollectionAlbumResponse, CollectionRecordResponse } from "@models/Collection";
import { editionChips, type Edition } from "@components/AddVinyls/editionLabels";

// Same rule as the API: pressings of one Discogs master are one work
export const workKey = (album: CollectionAlbumResponse): string =>
  album.external_master_id || `release:${album.id}`;

/** Groups a flat list of albums (collection search results) into works, in order of first appearance. */
export function groupIntoRecords(albums: CollectionAlbumResponse[]): CollectionRecordResponse[] {
  const works = new Map<string, CollectionAlbumResponse[]>();
  for (const album of albums) {
    const key = workKey(album);
    works.set(key, [...(works.get(key) ?? []), album]);
  }
  return [...works.entries()].map(([key, pressings]) => {
    const sorted = [...pressings].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return {
      work_key: key,
      title: sorted[0].title,
      image_url: sorted[0].image_url,
      pressings: sorted,
      pressings_count: sorted.length,
      copies_count: sorted.reduce((total, p) => total + (p.copies_count ?? 1), 0),
      created_at: sorted[0].created_at,
      updated_at: sorted[sorted.length - 1].created_at,
    };
  });
}

// A work shown as a card: its first pressing stands for it
export type RecordCard = CollectionAlbumResponse & { record: CollectionRecordResponse };

export const toRecordCard = (record: CollectionRecordResponse): RecordCard => ({
  ...record.pressings[0],
  // The card counts every copy of the work, all pressings together
  copies_count: record.copies_count,
  record,
});

/** Pressing details stored for a release of the collection (filled by the Discogs enrichment). */
export const storedEdition = (pressing: CollectionAlbumResponse): Edition => ({
  year: pressing.release_year ? String(pressing.release_year) : null,
  country: pressing.country,
  label: pressing.label,
  catno: pressing.catno,
  formats: pressing.formats ?? [],
});

/** "1959, US, Columbia CL 1355" from the stored details, or the place of the pressing in the list. */
export function pressingTitle(pressing: CollectionAlbumResponse, number: number): string {
  const details = editionChips({ ...storedEdition(pressing), formats: [] }).map((chip) => chip.label);
  return details.length > 0 ? details.join(", ") : `Pressing ${number}`;
}
