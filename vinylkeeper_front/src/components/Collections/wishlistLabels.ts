import type { WishlistPressing } from "@models/IExternalReference";
import { editionChips, type Edition } from "@components/Records/editionLabels";
import i18n from "@utils/i18n";

/** Translation key of the tooltip of the "Got it" button of a wanted record, on its card and in its popup */
export const GOT_IT_TOOLTIP = "collections:wishlist.gotItTooltip";
export const ARTIST_TO_COLLECTION_TOOLTIP = "collections:wishlist.artistTooltip";

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
  return details.length > 0 ? details.join(", ") : i18n.t("collections:wishlist.pressingNumber", { number });
}
