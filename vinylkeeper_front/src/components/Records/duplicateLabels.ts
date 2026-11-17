import type { OwnedPressing } from "@models/IExternalReference";
import i18n, { localizedCountry } from "@utils/i18n";

export interface DuplicatePrompt {
  collectionId: number;
  // Same release: another copy of it; other pressing: a new record of the same work
  addCopy: boolean;
  message: string;
  confirmLabel: string;
}

// Only a confirmed pressing is stated as the user's: the others may be the first release once offered
export function pressingSummary(owned: OwnedPressing): string {
  if (!owned.pressing_confirmed) return "";
  const labelAndCatno = [owned.label, owned.catno].filter(Boolean).join(" ");
  return [owned.release_year ? String(owned.release_year) : "", owned.country ? localizedCountry(owned.country) : "", labelAndCatno]
    .filter(Boolean)
    .join(", ");
}

export function duplicatePrompt(owned: OwnedPressing[], collectionId: number): DuplicatePrompt | null {
  const here = owned.filter((o) => o.collection_id === collectionId);
  if (here.length === 0) return null;

  const same = here.find((o) => o.same_release);
  if (same) {
    const count = same.copies_count > 1 ? ` (×${same.copies_count})` : "";
    return {
      collectionId,
      addCopy: true,
      message: i18n.t("records:duplicate.samePressing", { collection: same.collection_name, count }),
      confirmLabel: i18n.t("records:duplicate.addCopy"),
    };
  }

  const summaries = here.map(pressingSummary).filter(Boolean);
  const details = summaries.length > 0 ? ` (${summaries.join("; ")})` : "";
  const what = here.length > 1
    ? i18n.t("records:duplicate.otherPressings", { count: here.length })
    : i18n.t("records:duplicate.otherPressing");
  return {
    collectionId,
    addCopy: false,
    message: i18n.t("records:duplicate.alreadyHave", { what, collection: here[0].collection_name, details }),
    confirmLabel: i18n.t("records:duplicate.addPressing"),
  };
}

export function ownedHint(owned: OwnedPressing[], collectionId: number): string | null {
  const here = owned.filter((o) => o.collection_id === collectionId);
  if (here.length === 0) return null;
  return here.some((o) => o.same_release)
    ? i18n.t("records:duplicate.hintSame")
    : i18n.t("records:duplicate.hintOther");
}
