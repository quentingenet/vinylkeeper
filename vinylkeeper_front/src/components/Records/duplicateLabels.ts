import type { OwnedPressing } from "@models/IExternalReference";

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
  return [owned.release_year ? String(owned.release_year) : "", owned.country ?? "", labelAndCatno]
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
      message: `You already have this pressing in ${same.collection_name}${count}. Add another copy?`,
      confirmLabel: "Add another copy",
    };
  }

  const summaries = here.map(pressingSummary).filter(Boolean);
  const details = summaries.length > 0 ? ` (${summaries.join("; ")})` : "";
  const what = here.length > 1 ? `${here.length} other pressings of this record` : "another pressing of this record";
  return {
    collectionId,
    addCopy: false,
    message: `You already have ${what} in ${here[0].collection_name}${details}. Add this pressing too?`,
    confirmLabel: "Add this pressing",
  };
}

export function ownedHint(owned: OwnedPressing[], collectionId: number): string | null {
  const here = owned.filter((o) => o.collection_id === collectionId);
  if (here.length === 0) return null;
  return here.some((o) => o.same_release) ? "You have this pressing here" : "You have another pressing here";
}
