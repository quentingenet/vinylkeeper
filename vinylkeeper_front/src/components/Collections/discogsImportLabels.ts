import type { DiscogsImport, DiscogsImportPreview } from "@models/IDiscogsImport";
import i18n from "@utils/i18n";

/** The conditions of an import, listed before it starts */
export const importConditions = (): string[] => i18n.t("discogs:conditions", { returnObjects: true }) as string[];

/** What the user reads when Discogs sends them back to the app (?discogs=...) */
export function connectionOutcomeMessage(outcome: string | null): { severity: "success" | "warning"; text: string } | null {
  switch (outcome) {
    case null:
      return null;
    case "connected":
      return { severity: "success", text: i18n.t("discogs:outcome.connected") };
    case "denied":
      return { severity: "warning", text: i18n.t("discogs:outcome.denied") };
    case "expired":
      return { severity: "warning", text: i18n.t("discogs:outcome.expired") };
    case "session":
      // The browser that came back from Discogs is not logged in as the user who started the connection
      return { severity: "warning", text: i18n.t("discogs:outcome.session") };
    default:
      return { severity: "warning", text: i18n.t("discogs:outcome.failed") };
  }
}

/** What the progress bar shows: a label, and a value from 0 to 100 (null while unknown). */
export function importProgress(job: DiscogsImport): { label: string; value: number | null } {
  if (job.status === "queued") {
    return { label: i18n.t("discogs:progress.queued"), value: null };
  }
  if (job.pages_total === 0) {
    return { label: i18n.t("discogs:progress.connecting"), value: null };
  }
  const isWantlist = job.phase === "wantlist";
  // With the wantlist, each phase fills half of the bar
  const scaled = (value: number) =>
    !job.include_wantlist ? value : isWantlist ? 50 + value / 2 : value / 2;
  if (job.pages_done < job.pages_total) {
    return {
      label: i18n.t(isWantlist ? "discogs:progress.readingWantlist" : "discogs:progress.readingCollection", {
        done: job.pages_done,
        total: job.pages_total,
      }),
      value: scaled((job.pages_done / job.pages_total) * 50),
    };
  }
  const processed = isWantlist
    ? job.wantlist_added + job.wantlist_already_in_wishlist + job.wantlist_owned
    : job.added + job.already_in_collection;
  const total = isWantlist ? job.wantlist_vinyl_found : job.vinyl_found;
  return {
    label: i18n.t(isWantlist ? "discogs:progress.addingWishlist" : "discogs:progress.addingRecords", { processed, total }),
    value: scaled(50 + (total > 0 ? (processed / total) * 50 : 50)),
  };
}

/** The parts of the summary the owner may want to check, empty ones left out. */
export function summaryDetails(job: DiscogsImport): string[] {
  return [
    job.copies_added > job.added ? i18n.t("discogs:summary.copies", { count: job.copies_added }) : null,
    job.already_in_collection > 0
      ? i18n.t("discogs:summary.alreadyInCollection", { count: job.already_in_collection })
      : null,
    job.other_formats > 0 ? i18n.t("discogs:summary.otherFormats", { count: job.other_formats }) : null,
  ].filter((detail): detail is string => detail !== null);
}

/** Added records worth a look: another pressing of a record already there, or already elsewhere. */
export function summaryWarnings(job: DiscogsImport): string[] {
  return [
    job.saved_copy_name ? i18n.t("discogs:summary.savedCopy", { name: job.saved_copy_name }) : null,
    job.other_pressings > 0 ? i18n.t("discogs:summary.otherPressings", { count: job.other_pressings }) : null,
    job.in_other_collections > 0
      ? i18n.t("discogs:summary.inOtherCollections", { count: job.in_other_collections })
      : null,
  ].filter((warning): warning is string => warning !== null);
}

/** Name the API gives to the saved copy of a collection: "SAVE Jazz shelf (2026-10-29)". Not translated: the API names it. */
export function savedCopyName(collectionName: string, today: Date = new Date()): string {
  const day = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  return `SAVE ${collectionName} (${day})`;
}

/** Why a second save of a collection is refused: one save per collection. */
export const oneSaveMessage = (saveName: string): string => i18n.t("discogs:save.oneOnly", { name: saveName });

/** Importing into a collection that is already saved: the save is kept as it is, not updated. */
export const existingSaveWarning = (saveName: string): string => i18n.t("discogs:save.existing", { name: saveName });

/** The wantlist part of the summary: what went into the wishlist, or why it did not. */
export function wantlistSummary(job: DiscogsImport): { text: string; isError: boolean } | null {
  if (!job.include_wantlist) return null;
  if (job.wantlist_error) return { text: i18n.t("discogs:wantlist.error", { error: job.wantlist_error }), isError: true };
  const details = [
    job.wantlist_already_in_wishlist > 0
      ? i18n.t("discogs:wantlist.alreadyThere", { count: job.wantlist_already_in_wishlist })
      : null,
    job.wantlist_owned > 0 ? i18n.t("discogs:wantlist.owned", { count: job.wantlist_owned }) : null,
    job.wantlist_other_formats > 0
      ? i18n.t("discogs:wantlist.otherFormats", { count: job.wantlist_other_formats })
      : null,
  ].filter((detail): detail is string => detail !== null);
  const pressings =
    job.wantlist_other_pressings_owned > 0
      ? i18n.t("discogs:wantlist.otherPressings", { count: job.wantlist_other_pressings_owned })
      : "";
  return {
    text: i18n.t("discogs:wantlist.added", {
      count: job.wantlist_added,
      details: details.length > 0 ? ` (${details.join(", ")})` : "",
      pressings,
    }),
    isError: false,
  };
}

/** The wantlist can be imported along: readable and not empty */
export const canImportWantlist = (preview: DiscogsImportPreview): boolean =>
  (preview.wantlist_items_total ?? 0) > 0;

/** What the preview says, the wantlist included when it is imported too. */
export function previewMessage(preview: DiscogsImportPreview, includeWantlist: boolean): string {
  if (preview.items_total === 0) return i18n.t("discogs:preview.empty");
  const found = includeWantlist && canImportWantlist(preview)
    ? i18n.t("discogs:preview.withWantlist", { count: preview.items_total, wantlist: preview.wantlist_items_total })
    : i18n.t("discogs:preview.found", { count: preview.items_total });
  return `${found} ${i18n.t("discogs:preview.vinylOnly")}`;
}

/** Why the wantlist cannot be imported along, null when it can. */
export function wantlistUnavailableReason(preview: DiscogsImportPreview): string | null {
  if (canImportWantlist(preview)) return null;
  if (preview.wantlist_private) return i18n.t("discogs:unavailable.private");
  if (preview.wantlist_items_total === 0) return i18n.t("discogs:unavailable.empty");
  return i18n.t("discogs:unavailable.later");
}
