import { createTheme } from "@mui/material/styles";

const ThemeVinylKeeper = createTheme({
  palette: {
    primary: {
      main: "#ff4400",
    },
    secondary: {
      main: "#f44336",
    },
  },
  typography: {
    h1: {
      margin: "3% 2%",
      textAlign: "center",
      textShadow: "0 0 10px #2e3440",
      opacity: 0.8,
      fontSize: "6rem",
      fontFamily: "RockSalt",
      fontWeight: "bold",
      color: "#fffbf9",
    },
    h2: {},
    h3: {},
    h4: {},
    h5: {},
    h6: {},
    subtitle1: {},
    subtitle2: {},
    body1: {},
    body2: {},
    button: {},
    caption: {},
    overline: {},
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          cursor: "pointer",
          fontSize: "1.3rem",
          fontFamily: "Oswald-Regular",
          textTransform: "none",
          color: "#fffbf9",
          margin: "1rem",
          padding: "5px 25px",
          backgroundColor: "#2e3440",
          border: "1px solid #2e3440",
          borderRadius: "5px",
          boxShadow: "0 0 10px #2e3440",
          textShadow: "0 0 10px #2e3440",
          opacity: 0.6,
          "&:hover": {
            backgroundColor: " #fffbf9",
            color: "#2e3440",
            border: "1px solid #2e3440",
            borderRadius: "5px",
            opacity: 0.8,
          },
        },
      },
    },
  },
});

export default ThemeVinylKeeper;
