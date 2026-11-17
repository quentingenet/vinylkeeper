import { useMemo } from "react";
import { BrowserRouter, matchPath, useLocation } from "react-router-dom";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  deDE as muiDeDE,
  enUS as muiEnUS,
  esES as muiEsES,
  frFR as muiFrFR,
  itIT as muiItIT,
  ptBR as muiPtBR,
  ptPT as muiPtPT,
} from "@mui/material/locale";
import {
  deDE as pickersDeDE,
  enUS as pickersEnUS,
  itIT as pickersItIT,
  esES as pickersEsES,
  frFR as pickersFrFR,
  ptBR as pickersPtBR,
  ptPT as pickersPtPT,
} from "@mui/x-date-pickers/locales";
import { useTranslation } from "react-i18next";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { de, enUS, es, fr, it, pt, ptBR } from "date-fns/locale";
import { formatLocale, toAppLanguage, type AppLanguage } from "@utils/i18n";
import useDetectMobile from "@hooks/useDetectMobile";
import { UserContextProvider, useUserContext } from "@contexts/UserContext";
import App from "./App";
import NativeLinkHandler from "@components/Native/NativeLinkHandler";
import NativeUpdatePrompt from "@components/Native/NativeUpdatePrompt";
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

// Texts of MUI itself (pagination, date pickers) and month names of the date pickers, per language
const LOCALES = {
  en: { mui: muiEnUS, pickers: pickersEnUS, dateFns: enUS },
  fr: { mui: muiFrFR, pickers: pickersFrFR, dateFns: fr },
  es: { mui: muiEsES, pickers: pickersEsES, dateFns: es },
  pt: { mui: muiPtPT, pickers: pickersPtPT, dateFns: pt },
  de: { mui: muiDeDE, pickers: pickersDeDE, dateFns: de },
  it: { mui: muiItIT, pickers: pickersItIT, dateFns: it },
  ptBR: { mui: muiPtBR, pickers: pickersPtBR, dateFns: ptBR },
} satisfies Record<AppLanguage | "ptBR", object>;

const RootContent: React.FC = () => {
  const { i18n } = useTranslation();
  const language = toAppLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { isMobile } = useDetectMobile();
  const { isUserLoggedIn } = useUserContext();
  const { pathname } = useLocation();
  // The public Atlas, a shared collection and the terms are pages of the app, shown to visitors: same theme as for members
  const usesAppTheme =
    isUserLoggedIn ||
    pathname === EGlobalUrls.ATLAS ||
    pathname === EGlobalUrls.TERMS ||
    matchPath(EGlobalUrls.SHARED_COLLECTION, pathname) !== null;

  const baseTheme = useMemo(() => {
    return !usesAppTheme
      ? isMobile
        ? MobileThemeLandpageVinylKeeper
        : DesktopThemeLandpageVinylKeeper
      : isMobile
      ? MobileThemeAppVinylKeeper
      : DesktopThemeAppVinylKeeper;
  }, [isMobile, usesAppTheme]);
  // Brazilian Portuguese for a device set to pt-BR, the Portuguese of Portugal otherwise
  const brazilian = language === "pt" && formatLocale() === "pt-BR";
  const locale = LOCALES[brazilian ? "ptBR" : language];
  const theme = useMemo(() => createTheme(baseTheme, locale.mui, locale.pickers), [baseTheme, locale]);
  const dateLocale = locale.dateFns;

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
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
          <NativeLinkHandler />
          <NativeUpdatePrompt />
          <RootContent />
        </UserContextProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);

export default Root;
