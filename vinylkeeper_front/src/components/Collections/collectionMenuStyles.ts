// The small menus and buttons of a collection (Export to, Share): same text on desktop and mobile

export const desktopMenuTextSx = {
  fontSize: "0.875rem",
  fontFamily: "Oswald",
  lineHeight: 1.6,
};

export const collectionMenuPaperSx = (isMobile: boolean) => ({
  "& .MuiMenuItem-root": { py: 0.25, minHeight: 32 },
  "& .MuiTypography-root": isMobile ? { fontSize: "0.95rem" } : desktopMenuTextSx,
});

export const collectionActionButtonSx = {
  minHeight: 30,
  paddingY: 0.25,
  paddingX: 1,
  lineHeight: 1.2,
  textTransform: "none",
};
