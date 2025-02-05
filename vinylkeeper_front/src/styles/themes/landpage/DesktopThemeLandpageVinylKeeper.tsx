import { createTheme } from "@mui/material/styles";

const DesktopThemeLandpageVinylKeeper = createTheme({
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
      margin: "3% 2%",
      textAlign: "center",
      textShadow: "0 0 10px #2e3440",
      opacity: 0.8,
      fontSize: "6rem",
      fontFamily: "RockSalt",
      fontWeight: "bold",
      color: "#fffbf9",
    },
    subtitle2: {
      fontFamily: "Oswald-Light",
      fontSize: "1.2rem",
      color: "#fffbf9",
      opacity: 0.9,
    },
    caption: {
      fontFamily: "Oswald-Light",
      fontSize: ".9rem",
      color: "#fffbf9",
      opacity: 0.9,
    },
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
            "& .MuiOutlinedInput-input": {
              color: "black",
            },
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          textAlign: "center",
          "&.Mui-error": {
            color: "black",
            fontWeight: "bold",
          },
        },
      },
    },
  },
});

export default DesktopThemeLandpageVinylKeeper;
