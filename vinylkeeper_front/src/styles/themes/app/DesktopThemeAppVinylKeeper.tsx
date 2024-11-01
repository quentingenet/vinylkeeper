import { createTheme } from "@mui/material/styles";

const DesktopThemeAppVinylKeeper = createTheme({
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
      color: "#fffbf9",
      fontSize: "2.5rem",
      fontWeight: 600,
      textShadow: "0 0 10px #2e3440",
    },
    h2: {
      color: "#fffbf9",
      fontSize: "2rem",
      fontWeight: 500,
      textShadow: "0 0 8px #2e3440",
    },
    body1: { color: "#e4e4e4", fontSize: "1rem" },
    button: { textTransform: "none", fontFamily: "Oswald" }, // Effet de texte cohérent avec la landing page
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
          boxShadow: "0 0 5px rgba(0,0,0,0.4)", // Ombrage pour rappel de la landing page
          "&:hover": {
            backgroundColor: "#fffbf9", // Inversion au survol pour effet immersif
            color: "#2e3440",
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#3f3f41", // Fond du Drawer harmonisé avec la palette
          color: "#fffbf9",
          width: 280, // Largeur du Drawer pour desktop
          boxShadow: "0 0 10px rgba(0,0,0,0.6)", // Ombrage cohérent avec la landing page
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#3f3f41", // Fond de l'AppBar
          boxShadow: "0 0 5px rgba(0,0,0,0.4)", // Ombrage léger
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

export default DesktopThemeAppVinylKeeper;
