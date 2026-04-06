import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
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
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

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
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
        <App />
      </LocalizationProvider>
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
