import { colors } from "@styles/colors";

/**
 * The one format of every menu opened from a button (Share to, Export to, Report abuse, language): one
 * size on a computer, another on a phone. Change it here, every menu follows.
 */
const desktopTextSx = { fontSize: "0.875rem", fontFamily: "Oswald", lineHeight: 1.6 };
const mobileTextSx = { fontSize: "0.85rem", fontFamily: "Oswald", lineHeight: 1.5 };

/** On the ListItemText itself: wins over the theme, which sizes every ListItemText for the navigation menu */
export const menuItemTextSx = (isMobile: boolean) => ({
  "& .MuiListItemText-primary": isMobile ? mobileTextSx : desktopTextSx,
});

/** Tight rows on a computer, rows a finger can hit on a phone; the dark menu of the app on every page */
export const menuPaperSx = (isMobile: boolean) => ({
  bgcolor: colors.paper,
  color: colors.textLight,
  "& .MuiMenuItem-root": isMobile ? { py: 0.5, minHeight: 40 } : { py: 0.25, minHeight: 32 },
});

export const menuIconSx = { minWidth: 28, color: "inherit", "& .MuiSvgIcon-root": { fontSize: 18 } };
