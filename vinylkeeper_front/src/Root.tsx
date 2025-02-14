import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import useDetectMobile from "@hooks/useDetectMobile";
import { UserContextProvider, useUserContext } from "@contexts/UserContext";
import App from "./App";
import MobileThemeLandpageVinylKeeper from "@styles/themes/landpage/MobileThemeLandpageVinylKeeper";
import DesktopThemeLandpageVinylKeeper from "@styles/themes/landpage/DesktopThemeLandpageVinylKeeper";
import DesktopThemeAppVinylKeeper from "@styles/themes/app/DesktopThemeAppVinylKeeper";
import MobileThemeAppVinylKeeper from "@styles/themes/app/MobileThemeAppVinylKeeper";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const RootContent: React.FC = () => {
  const { isMobile } = useDetectMobile();
  const { isUserLoggedIn } = useUserContext();

  const theme = useMemo(() => {
    return !isUserLoggedIn
      ? isMobile
        ? MobileThemeLandpageVinylKeeper
        : DesktopThemeLandpageVinylKeeper
      : isMobile
      ? MobileThemeAppVinylKeeper
      : DesktopThemeAppVinylKeeper;
  }, [isMobile, isUserLoggedIn]);

  return (
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  );
};

const Root: React.FC = () => (
  <React.StrictMode>
    <BrowserRouter>
      <UserContextProvider>
        <QueryClientProvider client={queryClient}>
          <RootContent />
        </QueryClientProvider>
      </UserContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);

export default Root;
