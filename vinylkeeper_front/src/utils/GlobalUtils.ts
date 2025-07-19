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

// Vinyl states enum to match backend
export const vinylStates = [
  { id: "not_defined", name: "Not defined" },
  { id: "mint", name: "Mint" },
  { id: "near_mint", name: "Near Mint" },
  { id: "very_good_plus", name: "Very Good Plus" },
  { id: "very_good", name: "Very Good" },
  { id: "good_plus", name: "Good Plus" },
  { id: "good", name: "Good" },
  { id: "fair", name: "Fair" },
  { id: "poor", name: "Poor" },
];

export enum PlaceType {
  FLEA_MARKET = "flea market",
  SHOP = "shop",
  EXHIBITION = "music or records exhibition",
  OTHER = "other",
}
