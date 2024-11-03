// MobileThemeAppVinylKeeper.js
import { createTheme } from "@mui/material/styles";

const MobileThemeAppVinylKeeper = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2e3440", // Gris profond pour unifier avec la landing page
    },
    background: {
      default: "#3f3f41", // Fond principal unifié avec la landing page
      paper: "#2c2c2e", // Fond pour les surfaces avec contraste doux
    },
    text: {
      primary: "#fffbf9", // Texte principal pour un meilleur contraste
      secondary: "#b0b0b0", // Texte secondaire pour labels et axes
    },
  },
  typography: {
    fontFamily: "Roboto, Oswald, sans-serif", // Intégration d'Oswald pour cohérence
    h1: {
      color: "#C9A726",
      fontSize: "1.75rem", // Ajustement de taille pour mobile
      fontWeight: 600,
      textShadow: "2px 2px 4px #000000",
    },
    h2: {
      color: "#fffbf9",
      fontSize: "1.5rem", // Ajustement de taille pour mobile
      fontWeight: 500,
      textShadow: "0 0 8px #2e3440",
    },
    body1: { color: "#e4e4e4", fontSize: "0.875rem" },
    button: { textTransform: "none", fontFamily: "Oswald" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#2e3440", // Gris profond pour boutons
          color: "#fffbf9",
          border: "1px solid #2e3440",
          borderRadius: "5px",
          textShadow: "0 0 10px #2e3440",
          boxShadow: "0 0 5px rgba(0,0,0,0.4)",
          "&:hover": {
            backgroundColor: "#fffbf9", // Inversion au survol pour effet immersif
            color: "#2e3440",
          },
          padding: "8px 16px",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1f1f1f",
          color: "#fffbf9",
          width: "100%", // Drawer en pleine largeur pour mobile
          boxShadow: "0 0 10px rgba(0,0,0,0.6)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#3f3f41",
          boxShadow: "0 0 5px rgba(0,0,0,0.4)",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body1: {
          color: "#fffbf9",
          opacity: 0.9,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: "1.4rem", // Taille du texte plus grande pour les éléments de menu
        },
      },
    },
  },
});

export default MobileThemeAppVinylKeeper;
