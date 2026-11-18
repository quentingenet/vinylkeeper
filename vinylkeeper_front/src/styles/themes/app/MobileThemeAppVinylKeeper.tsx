// MobileThemeAppVinylKeeper.js
import { createTheme } from "@mui/material/styles";
import { colors } from "@styles/colors";

const shadow = "0 0 10px rgba(0,0,0,0.6)";

const MobileThemeAppVinylKeeper = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.gold,
      dark: colors.goldDark,
    },
    background: {
      default: colors.surface,
      paper: colors.paper,
    },
    text: {
      primary: colors.textLight,
      secondary: colors.textSecondary,
    },
  },
  typography: {
    fontFamily: "Roboto, Oswald, sans-serif",
    h1: {
      color: colors.gold,
      fontSize: "1.75rem",
      fontWeight: 600,
      textShadow: `2px 2px 4px ${colors.black}`,
    },
    h2: {
      color: colors.textLight,
      fontSize: "1.5rem", // Size adjustment for mobile
      fontWeight: 500,
      textShadow: `0 0 8px ${colors.slate}`,
    },
    h3: {
      color: colors.textLight,
      fontSize: "1.2rem",
      fontWeight: 500,
      textShadow: `0 0 8px ${colors.slate}`,
    },
    body1: {
      color: colors.textMuted,
      fontSize: "0.875rem",
    },
    button: {
      textTransform: "none",
      fontFamily: "Oswald",
    },
  },
  components: {
    // Full screen dialogs (add a record, Discogs import...) keep out of the notch and the home bar of the iPhone
    // (the --safe-* variables are 0 on the web and on Android)
    MuiDialog: {
      styleOverrides: {
        // A tall dialog that is not full screen keeps its 32px from the edges, out of the notch and the home bar too
        paper: {
          "&:not(.MuiDialog-paperFullScreen)": {
            marginTop: "calc(32px + var(--safe-top))",
            marginBottom: "calc(32px + var(--safe-bottom))",
            maxHeight: "calc(100% - 64px - var(--safe-top) - var(--safe-bottom))",
          },
        },
        paperFullScreen: {
          paddingTop: "var(--safe-top)",
          paddingBottom: "var(--safe-bottom)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.slate,
          color: colors.textLight,
          border: `1px solid ${colors.slate}`,
          borderRadius: "5px",
          textShadow: `0 0 10px ${colors.slate}`,
          boxShadow: shadow,
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            backgroundColor: colors.textLight,
            color: colors.slate,
          },
          padding: "6px 12px",
          fontSize: "0.875rem",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.deep,
          color: colors.textLight,
          width: "100%",
          boxShadow: shadow,
          transition: "all 0.3s ease-in-out",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.surface,
          boxShadow: "0 0 5px rgba(0,0,0,0.4)",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body1: {
          color: colors.textLight,
          opacity: 0.9,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: "1.5rem",
          opacity: 0.9,
        },
      },
    },
  },
});

export default MobileThemeAppVinylKeeper;
