import { createTheme } from "@mui/material/styles";
import { colors } from "@styles/colors";

const MobileThemeLandpageVinylKeeper = createTheme({
  palette: {
    primary: {
      main: colors.slate,
    },
    secondary: {
      main: colors.textLight,
    },
    error: {
      main: colors.slate,
    },
  },
  typography: {
    h1: {
      textAlign: "center",
      textShadow: `0 0 10px ${colors.slate}`,
      opacity: 0.8,
      fontSize: "4rem",
      fontFamily: "RockSalt",
      fontWeight: "bold",
      color: colors.textLight,
    },
    subtitle2: {
      fontFamily: "Oswald-Light",
      fontSize: "1.2rem",
      color: colors.textLight,
      opacity: 0.9,
    },
    caption: {
      fontFamily: "Oswald-Light",
      fontSize: ".9rem",
      color: colors.textLight,
      opacity: 0.9,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          cursor: "pointer",
          fontSize: "1rem",
          fontFamily: "Oswald-Regular",
          textTransform: "none",
          color: colors.textLight,
          margin: "1rem",
          padding: "5px 25px",
          backgroundColor: colors.slate,
          border: `1px solid ${colors.slate}`,
          borderRadius: "5px",
          boxShadow: `0 0 10px ${colors.slate}`,
          textShadow: `0 0 10px ${colors.slate}`,
          opacity: 0.8,
          "&:hover": {
            backgroundColor: colors.textLight,
            color: colors.slate,
            border: `1px solid ${colors.slate}`,
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

export default MobileThemeLandpageVinylKeeper;
