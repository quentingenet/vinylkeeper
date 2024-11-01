import React from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import useDetectMobile from "@hooks/useDetectMobile";
import { UserContextProvider, useUserContext } from "@contexts/UserContext";
import App from "./App";
import MobileThemeLandpageVinylKeeper from "@styles/themes/landpage/MobileThemeLandpageVinylKeeper";
import DesktopThemeLandpageVinylKeeper from "@styles/themes/landpage/DesktopThemeLandpageVinylKeeper";
import DesktopThemeAppVinylKeeper from "@styles/themes/app/DesktopThemeAppVinylKeeper";
import MobileThemeAppVinylKeeper from "@styles/themes/app/MobileThemeAppVinylKeeper";

const RootContent: React.FC = () => {
  const { isMobile } = useDetectMobile();
  const { isUserLoggedIn } = useUserContext();

  const theme = !isUserLoggedIn
    ? isMobile
      ? MobileThemeLandpageVinylKeeper
      : DesktopThemeLandpageVinylKeeper
    : isMobile
    ? MobileThemeAppVinylKeeper
    : DesktopThemeAppVinylKeeper;

  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
};

const Root: React.FC = () => (
  <React.StrictMode>
    <UserContextProvider>
      <RootContent />
    </UserContextProvider>
  </React.StrictMode>
);

export default Root;
