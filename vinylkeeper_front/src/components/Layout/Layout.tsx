import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import NavBar from "@components/NavBar/NavBar";
import MobileNavBar from "@components/NavBar/MobileNavBar";
import { useTheme } from "@mui/material/styles";
import useDetectMobile from "@hooks/useDetectMobile";
import { Typography } from "@mui/material";
import { usePageTitle } from "@hooks/usePageTitle";
import AddRecordProvider from "@components/AddRecord/AddRecordProvider";
import ScrollToTop from "@components/Layout/ScrollToTop";
import AddRecordFab from "@components/AddRecord/AddRecordFab";
import { colors } from "@styles/colors";
import DiscogsAttribution from "@components/UI/DiscogsAttribution";
import { DISCOGS_HOME_URL } from "@utils/discogsLinks";

/**
 * Layout component that provides the main structure for the application
 * Handles responsive navigation, title animations, and content layout
 *
 * @component
 * @param {LayoutProps} props - Component props
 * @returns {JSX.Element} Layout component with navigation and content area
 *
 * @example
 * <Layout>
 *   <SomeContent />
 * </Layout>
 */

/**
 * Layout component props interface
 * @interface LayoutProps
 * @property {React.ReactNode} children - Child components to be rendered within the layout
 */

const MENU_OPEN_MIN_WIDTH = 1024;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // Folded to icons on a narrow window (tablet held upright): the open menu is 240px of it. The user
  // can still open it with the arrow.
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= MENU_OPEN_MIN_WIDTH);
  const theme = useTheme();
  const { isMobile } = useDetectMobile();
  const toggleMenu = () => setOpen((prev) => !prev);
  const [titlePage, setTitlePage] = useState<string>("Vinyl Keeper");
  const [currentTitle, setCurrentTitle] = useState<string>("Vinyl Keeper");
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Use the page title hook to automatically update title based on current route
  usePageTitle(setTitlePage);

  useEffect(() => {
    if (titlePage !== currentTitle) {
      setIsAnimating(true);
      const timeout = setTimeout(() => {
        setCurrentTitle(titlePage);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [titlePage, currentTitle]);

  return (
    <AddRecordProvider>
    <ScrollToTop />
    <Box sx={{ display: "flex", minHeight: "100vh", overflow: "hidden" }}>
      {isMobile ? (
        <MobileNavBar setTitlePage={setTitlePage} titlePage={titlePage} />
      ) : (
        <NavBar
          open={open}
          toggleMenu={toggleMenu}
          setTitlePage={setTitlePage}
          titlePage={titlePage}
        />
      )}
      <Box
        sx={{
          flexGrow: 1,
          // A flex child cannot shrink below its content by default: wide content pushed the page
          // past the window when the menu opened, and the overflow was cut
          minWidth: 0,
          transition: theme.transitions.create(["margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          maxWidth: "1600px",
          marginX: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 2,
            textAlign: "center",
            mb: 3,
            opacity: isAnimating ? 0 : 1,
            transition: "opacity 0.3s ease-in-out, transform 0.3s ease-in-out",
          }}
        >
          {!isMobile && (
            <Typography variant="h1" component="h1" sx={{ color: colors.gold }}>
              {currentTitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            p: 1,
          }}
        >
          {children}
        </Box>

        {/* Discogs' terms: the covers and record data of every page come from Discogs. The record
            details, search and import popups also link the exact Discogs page. */}
        <Box component="footer" sx={{ width: "100%", textAlign: "center", pt: 3, pb: 1.5, opacity: 0.6 }}>
          <DiscogsAttribution href={DISCOGS_HOME_URL} />
        </Box>
      </Box>
      <AddRecordFab />
    </Box>
    </AddRecordProvider>
  );
};

export default Layout;
