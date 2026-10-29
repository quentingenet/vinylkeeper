import type { DiscogsImport } from "@models/IDiscogsImport";

export const IMPORT_CONDITIONS = [
  "You need a Discogs account.",
  "Your Discogs collection must be public: in Discogs, open Settings, then Privacy, and make your collection visible to everyone.",
  "Only vinyl records are imported: CDs, cassettes and other formats are skipped.",
  "Imported records have a pressing to confirm: check the pressing of each record in your collection. Country and condition are not imported.",
  "Your Discogs wantlist is not imported: only the collection is.",
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
  if (job.pages_done < job.pages_total) {
    return {
      label: `Reading your Discogs collection: page ${job.pages_done} of ${job.pages_total}.`,
      value: (job.pages_done / job.pages_total) * 50,
    };
  }
  const processed = job.added + job.already_in_collection;
  const total = job.vinyl_found;
  return {
    label: `Adding records: ${processed} of ${total}.`,
    value: 50 + (total > 0 ? (processed / total) * 50 : 50),
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
