import { v4 as uuidv4 } from "uuid";

export const API_VK_URL = import.meta.env.VITE_API_VK_URL;
export const API_DEEZER_URL = import.meta.env.VITE_API_DEEZER_URL;
export const API_MB_URL = import.meta.env.VITE_MB_API;
export const API_DISCOGS_URL = import.meta.env.VITE_DISCOGS_API_URL;

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

// Vinyl states array for UI components (keeping backward compatibility)
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

export enum PlaceType {
  FLEA_MARKET = "flea market",
  SHOP = "shop",
  EXHIBITION = "music or records exhibition",
  OTHER = "other",
}
