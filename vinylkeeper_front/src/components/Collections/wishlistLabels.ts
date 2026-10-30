import type { WishlistPressing } from "@models/IExternalReference";
import { editionChips, type Edition } from "@components/Records/editionLabels";

/** The tooltip of the "Got it" button of a wanted record, on its card and in its popup */
export const GOT_IT_TOOLTIP = "Got this record? Move it to one of your collections";
export const ARTIST_TO_COLLECTION_TOOLTIP = "Move this artist to one of your collections";

const editionOf = (pressing: WishlistPressing): Edition => ({
  year: pressing.release_year?.toString() ?? null,
  country: pressing.country,
  label: pressing.label,
  catno: pressing.catno,
  formats: pressing.formats,
});

/** "1959, US, Columbia CL 1355", or "Pressing 2" while the details are not known yet */
export function wantedPressingTitle(pressing: WishlistPressing, number: number): string {
  const details = editionChips({ ...editionOf(pressing), formats: [] }).map((chip) => chip.label);
  return details.length > 0 ? details.join(", ") : `Pressing ${number}`;
}
