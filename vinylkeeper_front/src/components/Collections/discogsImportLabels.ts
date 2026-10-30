import type { DiscogsImport, DiscogsImportPreview } from "@models/IDiscogsImport";

export const IMPORT_CONDITIONS = [
  "You need a Discogs account.",
  "Your Discogs collection must be public: in Discogs, open Settings, then Privacy, and make your collection visible to everyone.",
  "Only vinyl records are imported: CDs, cassettes and other formats are skipped.",
  "Imported records have a pressing to confirm: check the pressing of each record in your collection. Country and condition are not imported.",
  "Your Discogs wantlist goes into your wishlist only if you tick the box below, and it must be public too.",
  "Records already in the collection are not added twice.",
  "By default the records go into a new collection: deleting it undoes the import. Importing into an existing collection saves a copy of it first.",
];

/** What the progress bar shows: a label, and a value from 0 to 100 (null while unknown). */
export function importProgress(job: DiscogsImport): { label: string; value: number | null } {
  if (job.status === "queued") {
    return { label: "Waiting for another import to finish.", value: null };
  }
  if (job.pages_total === 0) {
    return { label: "Connecting to Discogs.", value: null };
  }
  const isWantlist = job.phase === "wantlist";
  // With the wantlist, each phase fills half of the bar
  const scaled = (value: number) =>
    !job.include_wantlist ? value : isWantlist ? 50 + value / 2 : value / 2;
  if (job.pages_done < job.pages_total) {
    return {
      label: `Reading your Discogs ${isWantlist ? "wantlist" : "collection"}: page ${job.pages_done} of ${job.pages_total}.`,
      value: scaled((job.pages_done / job.pages_total) * 50),
    };
  }
  const processed = isWantlist
    ? job.wantlist_added + job.wantlist_already_in_wishlist + job.wantlist_owned
    : job.added + job.already_in_collection;
  const total = isWantlist ? job.wantlist_vinyl_found : job.vinyl_found;
  return {
    label: `${isWantlist ? "Adding to your wishlist" : "Adding records"}: ${processed} of ${total}.`,
    value: scaled(50 + (total > 0 ? (processed / total) * 50 : 50)),
  };
}

export const plural = (count: number, word: string, pluralWord = `${word}s`) =>
  `${count} ${count === 1 ? word : pluralWord}`;

/** The parts of the summary the owner may want to check, empty ones left out. */
export function summaryDetails(job: DiscogsImport): string[] {
  return [
    job.copies_added > job.added ? `${plural(job.copies_added, "copy", "copies")} in all` : null,
    job.already_in_collection > 0 ? `${job.already_in_collection} already in the collection` : null,
    job.other_formats > 0 ? `${plural(job.other_formats, "other format")} skipped` : null,
  ].filter((detail): detail is string => detail !== null);
}

/** Added records worth a look: another pressing of a record already there, or already elsewhere. */
export function summaryWarnings(job: DiscogsImport): string[] {
  return [
    job.saved_copy_name
      ? `“${job.saved_copy_name}” is the save to restore this collection from: delete it once everything is fine.`
      : null,
    job.other_pressings > 0
      ? `${plural(job.other_pressings, "record is", "records are")} another pressing of a record you already had in this collection.`
      : null,
    job.in_other_collections > 0
      ? `${plural(job.in_other_collections, "record was", "records were")} already in another of your collections.`
      : null,
  ].filter((warning): warning is string => warning !== null);
}

/** Name the API gives to the saved copy of a collection: "SAVE Jazz shelf (2026-10-29)". */
export function savedCopyName(collectionName: string, today: Date = new Date()): string {
  const day = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  return `SAVE ${collectionName} (${day})`;
}

/** Why a second save of a collection is refused: one save per collection. */
export const oneSaveMessage = (saveName: string): string =>
  `Only one save per collection: “${saveName}” already exists. Delete it to make a new one.`;

/** Importing into a collection that is already saved: the save is kept as it is, not updated. */
export const existingSaveWarning = (saveName: string): string =>
  `This collection already has a save: “${saveName}”. Only one save per collection: it is kept as it is ` +
  "and is not updated with the current records. If it is out of date, cancel, delete that save, " +
  "then import again to save the collection as it is now.";

/** The wantlist part of the summary: what went into the wishlist, or why it did not. */
export function wantlistSummary(job: DiscogsImport): { text: string; isError: boolean } | null {
  if (!job.include_wantlist) return null;
  if (job.wantlist_error) return { text: `Wantlist not imported: ${job.wantlist_error}`, isError: true };
  const details = [
    job.wantlist_already_in_wishlist > 0 ? `${job.wantlist_already_in_wishlist} already there` : null,
    job.wantlist_owned > 0 ? `${plural(job.wantlist_owned, "record")} you already own skipped` : null,
    job.wantlist_other_formats > 0 ? `${plural(job.wantlist_other_formats, "other format")} skipped` : null,
  ].filter((detail): detail is string => detail !== null);
  const pressings =
    job.wantlist_other_pressings_owned > 0
      ? ` ${plural(job.wantlist_other_pressings_owned, "of them is", "of them are")} another pressing of a record you own.`
      : "";
  return {
    text:
      `Wantlist: ${plural(job.wantlist_added, "record")} added to your wishlist` +
      `${details.length > 0 ? ` (${details.join(", ")})` : ""}.${pressings}`,
    isError: false,
  };
}

/** The wantlist can be imported along: readable and not empty */
export const canImportWantlist = (preview: DiscogsImportPreview): boolean =>
  (preview.wantlist_items_total ?? 0) > 0;

/** What the preview says, the wantlist included when it is imported too. */
export function previewMessage(preview: DiscogsImportPreview, includeWantlist: boolean): string {
  if (preview.items_total === 0) return "This Discogs collection is empty.";
  const wantlist = includeWantlist && canImportWantlist(preview)
    ? ` and ${preview.wantlist_items_total} in its wantlist`
    : "";
  const found = wantlist
    ? `${plural(preview.items_total, "item")} in this Discogs collection${wantlist}.`
    : `${plural(preview.items_total, "item")} found in this Discogs collection.`;
  return `${found} Only the vinyl records will be imported.`;
}

/** Why the wantlist cannot be imported along, null when it can. */
export function wantlistUnavailableReason(preview: DiscogsImportPreview): string | null {
  if (canImportWantlist(preview)) return null;
  if (preview.wantlist_private) return "Your Discogs wantlist is private: make it public to import it.";
  if (preview.wantlist_items_total === 0) return "Your Discogs wantlist is empty.";
  return "Your Discogs wantlist could not be read right now. Try again in a few minutes.";
}
