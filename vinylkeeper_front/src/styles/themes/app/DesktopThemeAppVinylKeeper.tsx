import { createTheme } from "@mui/material/styles";
import { colors } from "@styles/colors";

const shadow = "0 0 10px rgba(0,0,0,0.6)";

const DesktopThemeAppVinylKeeper = createTheme({
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
      fontSize: "2.8rem",
      fontWeight: 600,
      textShadow: `2px 2px 4px ${colors.black}`,
    },
    h2: {
      color: colors.textLight,
      fontSize: "2rem",
      fontWeight: 500,
      textShadow: "2px 2px 5px rgba(0,0,0,0.7)",
    },
    h3: {
      color: colors.textLight,
      fontSize: "1.5rem",
      fontWeight: 500,
      textShadow: "2px 2px 5px rgba(0,0,0,0.7)",
    },
    body1: {
      color: colors.textMuted,
      fontSize: "1rem",
      textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
    },
    button: {
      textTransform: "none",
      fontFamily: "Oswald",
    },
  },
  components: {
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: "black",
          boxShadow: shadow,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          color: colors.gold,
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
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: colors.deep,
          color: colors.textLight,
          boxShadow: shadow,
          transition: "width 0.3s ease-in-out",
          width: 240,
          "@media (max-width: 600px)": {
            width: 60,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.surface,
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          borderBottom: `1px solid ${colors.slate}`,
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body1: {
          color: colors.textLight,
          opacity: 0.9,
          textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
        },
        h2: {
          color: colors.textLight,
          textShadow: "2px 2px 5px rgba(0,0,0,0.7)",
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: "1.6rem",
          opacity: 0.9,
        },
      },
    },
  },
});

export default DesktopThemeAppVinylKeeper;
