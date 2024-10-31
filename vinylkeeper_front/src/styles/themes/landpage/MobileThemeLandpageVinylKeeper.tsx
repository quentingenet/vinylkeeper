import { createTheme } from "@mui/material/styles";

const MobileThemeLandpageVinylKeeper = createTheme({
  palette: {
    primary: {
      main: "#2e3440",
    },
    secondary: {
      main: "#fffbf9",
    },
    error: {
      main: "#2e3440",
    },
  },
  typography: {
    h1: {
      textAlign: "center",
      textShadow: "0 0 10px #2e3440",
      opacity: 0.8,
      fontSize: "4rem",
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
    subtitle2: {
      fontFamily: "Oswald-Light",
      fontSize: "1.2rem",
      color: "#fffbf9",
      opacity: 0.9,
    },
    body1: {},
    body2: {},
    button: {},
    caption: {
      fontFamily: "Oswald-Light",
      fontSize: ".9rem",
      color: "#fffbf9",
      opacity: 0.9,
    },
    overline: {},
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          cursor: "pointer",
          fontSize: "1rem",
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
          opacity: 0.8,
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
    MuiTextField: {
      styleOverrides: {
        root: {
          "& label.Mui-focused": {
            color: "black",
          },
          "& .MuiInput-underline:after": {
            borderBottomColor: "black",
          },
          "& .MuiOutlinedInput-root": {
            "&.Mui-focused fieldset": {
              borderColor: "black",
            },
            "&.Mui-error fieldset": {
              borderColor: "black",
            },
          },
        },
      },
    },
  },
});

export default MobileThemeLandpageVinylKeeper;
