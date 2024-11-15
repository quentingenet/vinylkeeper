import { createTheme } from "@mui/material/styles";

const shadow = "0 0 10px rgba(0,0,0,0.6)";

const DesktopThemeAppVinylKeeper = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2e3440",
    },
    background: {
      default: "#3f3f41",
      paper: "#2c2c2e",
    },
    text: {
      primary: "#fffbf9",
      secondary: "#b0b0b0",
    },
  },
  typography: {
    fontFamily: "Roboto, Oswald, sans-serif",
    h1: {
      color: "#C9A726",
      fontSize: "2.8rem",
      fontWeight: 600,
      textShadow: "2px 2px 4px #000000",
    },
    h2: {
      color: "#fffbf9",
      fontSize: "2rem",
      fontWeight: 500,
      textShadow: "2px 2px 5px rgba(0,0,0,0.7)",
    },
    body1: {
      color: "#e4e4e4",
      fontSize: "1rem",
      textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
    },
    button: {
      textTransform: "none",
      fontFamily: "Oswald",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#2e3440",
          color: "#fffbf9",
          border: "1px solid #2e3440",
          borderRadius: "5px",
          textShadow: "0 0 10px #2e3440",
          boxShadow: shadow,
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            backgroundColor: "#fffbf9",
            color: "#2e3440",
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1f1f1f",
          color: "#fffbf9",
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
          backgroundColor: "#3f3f41",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          borderBottom: "1px solid #2e3440",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body1: {
          color: "#fffbf9",
          opacity: 0.9,
          textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
        },
        h2: {
          color: "#fffbf9",
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
