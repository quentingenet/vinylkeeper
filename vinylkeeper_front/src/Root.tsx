import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import ThemeVinylKeeper from "@styles/themes/ThemeVinylKeeper.tsx";
import useDetectMobile from "@hooks/useDetectMobile.tsx";
import MobileThemeVinylKeeper from "@styles/themes/MobileThemeVinylKeeper.tsx";
import { UserContextProvider } from "@contexts/UserContext.tsx";
import App from "./App.tsx";

const Root = () => {
  const { isMobile } = useDetectMobile();

  useEffect(() => {
    console.log("Hello, World!");
    console.log(isMobile);
    console.log(isMobile ? "Mobile theme" : "Desktop theme");
  }, [isMobile]);
  return (
    <React.StrictMode>
      <ThemeProvider
        theme={isMobile ? MobileThemeVinylKeeper : ThemeVinylKeeper}
      >
        <BrowserRouter>
          <UserContextProvider>
            <App />
          </UserContextProvider>
        </BrowserRouter>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default Root;
