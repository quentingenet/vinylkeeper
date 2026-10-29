import { useMemo } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { ThemeProvider } from "@mui/material/styles";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enUS } from "date-fns/locale";
import useDetectMobile from "@hooks/useDetectMobile";
import { UserContextProvider, useUserContext } from "@contexts/UserContext";
import App from "./App";
import MobileThemeLandpageVinylKeeper from "@styles/themes/landpage/MobileThemeLandpageVinylKeeper";
import DesktopThemeLandpageVinylKeeper from "@styles/themes/landpage/DesktopThemeLandpageVinylKeeper";
import DesktopThemeAppVinylKeeper from "@styles/themes/app/DesktopThemeAppVinylKeeper";
import MobileThemeAppVinylKeeper from "@styles/themes/app/MobileThemeAppVinylKeeper";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    // No retry: a write that reached the server before a network error would run twice
    mutations: {
      retry: 0,
    },
  },
});

const RootContent: React.FC = () => {
  const { isMobile } = useDetectMobile();
  const { isUserLoggedIn } = useUserContext();
  const { pathname } = useLocation();
  // The public Atlas is a page of the app, shown to visitors: same theme as for members
  const usesAppTheme = isUserLoggedIn || pathname === EGlobalUrls.ATLAS;

  const theme = useMemo(() => {
    return !usesAppTheme
      ? isMobile
        ? MobileThemeLandpageVinylKeeper
        : DesktopThemeLandpageVinylKeeper
      : isMobile
      ? MobileThemeAppVinylKeeper
      : DesktopThemeAppVinylKeeper;
  }, [isMobile, usesAppTheme]);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  );
};

const Root: React.FC = () => (
  <React.StrictMode>
    <BrowserRouter>
      {/* Above the user context: it clears the cache when the session ends */}
      <QueryClientProvider client={queryClient}>
        <UserContextProvider>
          <RootContent />
        </UserContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

export default Root;
