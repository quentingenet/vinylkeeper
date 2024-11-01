import { createTheme } from "@mui/material/styles";

const MobileThemeAppVinylKeeper = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#2e3440", // Gris profond pour rappeler la landing page
    },
    background: {
      default: "#3f3f41", // Fond principal de l'application
      paper: "#2c2c2e", // Fond des surfaces avec contraste doux
    },
    text: {
      primary: "#fffbf9", // Texte principal pour un bon contraste
      secondary: "#b0b0b0", // Texte secondaire
    },
  },
  typography: {
    fontFamily: "Roboto, Oswald, sans-serif", // Intégration d'Oswald pour rappeler la landing page
    h1: {
      color: "#fffbf9",
      fontSize: "1.75rem",
      fontWeight: 600,
      textShadow: "0 0 8px #2e3440",
    },
    h2: {
      color: "#fffbf9",
      fontSize: "1.5rem",
      fontWeight: 500,
      textShadow: "0 0 6px #2e3440",
    },
    body1: { color: "#e4e4e4", fontSize: "0.875rem" },
    button: { textTransform: "none", fontFamily: "Oswald" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#2e3440", // Gris profond pour les boutons
          color: "#fffbf9",
          fontSize: "0.875rem",
          border: "1px solid #2e3440",
          borderRadius: "5px",
          boxShadow: "0 0 5px rgba(0,0,0,0.4)", // Ombrage pour rappel de la landing page
          textShadow: "0 0 8px #2e3440",
          "&:hover": {
            backgroundColor: "#fffbf9", // Inversion au survol
            color: "#2e3440",
          },
          padding: "8px 16px", // Padding adapté au mobile
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3f3f41", // Fond du Drawer pour le mobile
          color: "#fffbf9",
          width: 240, // Largeur adaptée pour mobile
          boxShadow: "0 0 8px rgba(0,0,0,0.6)", // Ombrage plus doux pour mobile
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#3f3f41", // Fond de l'AppBar harmonisé
          boxShadow: "0 0 4px rgba(0,0,0,0.3)", // Ombrage plus léger pour mobile
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body1: {
          color: "#fffbf9", // Harmonisation du texte par défaut
          opacity: 0.9,
        },
      },
    },
  },
});

export default MobileThemeAppVinylKeeper;
