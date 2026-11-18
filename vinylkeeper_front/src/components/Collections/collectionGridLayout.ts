import type { Theme } from "@mui/material";

export const COLLECTION_CARD_WIDTH = 320;
export const COLLECTION_CARD_MARGIN = 1;
export const COLLECTION_GRID_DESKTOP_COLUMNS = 3;
export const COLLECTION_GRID_GAP = 4;

export const collectionGridDesktopWidth = (theme: Theme) =>
  `calc(${COLLECTION_GRID_DESKTOP_COLUMNS} * (${COLLECTION_CARD_WIDTH}px + ${theme.spacing(
    2 * COLLECTION_CARD_MARGIN
  )}) + ${theme.spacing((COLLECTION_GRID_DESKTOP_COLUMNS - 1) * COLLECTION_GRID_GAP)})`;

/**
 * Cards per row on a phone in the albums, artists and wishlist tabs of a collection: 2 for the compact
 * grid, 1 for one large card per row. The only switch: setting it back to 1 undoes the compact grid.
 */
export const MOBILE_CARD_COLUMNS: 1 | 2 = 2;
