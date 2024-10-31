import { createTheme } from "@mui/material/styles";

const DesktopThemeAppVinylKeeper = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#c9a726", // Jaune doré pour les éléments principaux
    },
    background: {
      default: "#353538", // Fond principal de l'application
      paper: "#3f3f41", // Fond pour les surfaces (Drawer, cartes, etc.)
    },
    text: {
      primary: "#e4e4e4", // Texte principal
      secondary: "#b0b0b0", // Texte secondaire pour labels et axes
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
    h1: { color: "#e4e4e4", fontSize: "2.5rem", fontWeight: 600 },
    h2: { color: "#e4e4e4", fontSize: "2rem", fontWeight: 500 },
    body1: { color: "#e4e4e4", fontSize: "1rem" },
    button: { textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: "#2c2c2e", // Couleur de fond des boutons
          color: "#e4e4e4",
          "&:hover": {
            backgroundColor: "#4a4a4c", // Couleur au survol
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3f3f41", // Couleur de fond du Drawer
          color: "#e4e4e4",
          width: 280, // Largeur du Drawer pour desktop
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

export default DesktopThemeAppVinylKeeper;
