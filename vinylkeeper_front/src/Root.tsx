import React from "react";
import { BrowserRouter } from "react-router-dom";
import ThemeProvider from "@mui/material/styles/ThemeProvider";

import useDetectMobile from "@hooks/useDetectMobile.tsx";
import { UserContextProvider, useUserContext } from "@contexts/UserContext.tsx";
import App from "./App.tsx";
import MobileThemeLandpageVinylKeeper from "@styles/themes/landpage/MobileThemeLandpageVinylKeeper.tsx";
import DesktopThemeLandpageVinylKeeper from "@styles/themes/landpage/DesktopThemeLandpageVinylKeeper.tsx";
import DesktopThemeAppVinylKeeper from "@styles/themes/app/DesktopThemeAppVinylKeeper.tsx";
import MobileThemeAppVinylKeeper from "@styles/themes/app/MobileThemeAppVinylKeeper.tsx";

const RootContent = () => {
  const { isMobile } = useDetectMobile();
  const { isUserLoggedIn } = useUserContext();

  return (
    <ThemeProvider
      theme={
        !isUserLoggedIn
          ? isMobile
            ? MobileThemeLandpageVinylKeeper
            : DesktopThemeLandpageVinylKeeper
          : isMobile
          ? MobileThemeAppVinylKeeper
          : DesktopThemeAppVinylKeeper
      }
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  );
};

const Root = () => {
  return (
    <React.StrictMode>
      <UserContextProvider>
        <RootContent />
      </UserContextProvider>
    </React.StrictMode>
  );
};

export default Root;
