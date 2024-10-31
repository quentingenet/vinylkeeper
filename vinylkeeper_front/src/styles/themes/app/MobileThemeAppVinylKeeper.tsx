import { createTheme } from "@mui/material/styles";

const MobileThemeAppVinylKeeper = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#c9a726", // Jaune doré pour les éléments principaux
    },
    background: {
      default: "#353538", // Fond principal
      paper: "#3f3f41", // Fond des surfaces comme le Drawer
    },
    text: {
      primary: "#e4e4e4", // Texte principal
      secondary: "#b0b0b0", // Texte secondaire
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
    h1: { color: "#e4e4e4", fontSize: "2rem", fontWeight: 600 },
    h2: { color: "#e4e4e4", fontSize: "1.75rem", fontWeight: 500 },
    body1: { color: "#e4e4e4", fontSize: "0.875rem" },
    button: { textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#2c2c2e", // Couleur de fond des boutons
          color: "#e4e4e4",
          fontSize: "0.875rem",
          "&:hover": {
            backgroundColor: "#4a4a4c", // Couleur au survol
          },
          padding: "8px 16px", // Plus petit padding pour mobile
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3f3f41", // Fond du Drawer
          color: "#e4e4e4",
          width: 240, // Largeur plus étroite pour mobile
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#353538", // Fond de l'AppBar
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body1: {
          color: "#e4e4e4", // Texte par défaut
        },
      },
    },
  },
});

export default MobileThemeAppVinylKeeper;
