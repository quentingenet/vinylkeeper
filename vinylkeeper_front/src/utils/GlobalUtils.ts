export const API_VK_URL = import.meta.env.VITE_API_VK_URL;
import i18n from "@utils/i18n";

// Items per page for collections pagination
export const ITEMS_PER_PAGE = 3;

export const getTimezone = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone;
};

export const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

// Vinyl states enum to match backend VinylStateEnum
export enum VinylStateEnum {
  MINT = "mint",
  NEAR_MINT = "near_mint",
  VERY_GOOD_PLUS = "very_good_plus",
  VERY_GOOD = "very_good",
  GOOD_PLUS = "good_plus",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
  NOT_DEFINED = "not_defined",
}

// Vinyl states array for UI components (keeping backward compatibility). The grades (Mint, Near Mint...)
// are the ones of Discogs and Goldmine and stay in English, as the Discogs formats; use vinylStateLabel
export const vinylStates = [
  { id: VinylStateEnum.NOT_DEFINED, name: "Not defined" },
  { id: VinylStateEnum.MINT, name: "Mint" },
  { id: VinylStateEnum.NEAR_MINT, name: "Near Mint" },
  { id: VinylStateEnum.VERY_GOOD_PLUS, name: "Very Good Plus" },
  { id: VinylStateEnum.VERY_GOOD, name: "Very Good" },
  { id: VinylStateEnum.GOOD_PLUS, name: "Good Plus" },
  { id: VinylStateEnum.GOOD, name: "Good" },
  { id: VinylStateEnum.FAIR, name: "Fair" },
  { id: VinylStateEnum.POOR, name: "Poor" },
];

/** What a state is called in the interface: the grade, or "Not defined" in the language of the interface. */
export const vinylStateLabel = (state: (typeof vinylStates)[number]): string =>
  state.id === VinylStateEnum.NOT_DEFINED ? i18n.t("records:states.notDefined") : state.name;

