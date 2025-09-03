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
      // Optimisations de performance
      staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
      gcTime: 30 * 60 * 1000, // 30 minutes - cache gardé en mémoire
      retry: 2, // 2 tentatives max
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponentiel
      refetchOnWindowFocus: false, // Évite les refetch inutiles
      refetchOnReconnect: true, // Refetch quand la connexion revient
      refetchOnMount: true, // Refetch au montage du composant
    },
    mutations: {
      retry: 1, // 1 tentative pour les mutations
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
