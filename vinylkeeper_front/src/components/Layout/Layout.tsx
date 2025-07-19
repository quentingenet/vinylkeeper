import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import NavBar from "@components/NavBar/NavBar";
import MobileNavBar from "@components/NavBar/MobileNavBar";
import { useTheme } from "@mui/material/styles";
import useDetectMobile from "@hooks/useDetectMobile";
import { Typography } from "@mui/material";
import { usePageTitle } from "@hooks/usePageTitle";

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

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const theme = useTheme();
  const { isMobile } = useDetectMobile();
  const toggleMenu = () => setOpen((prev) => !prev);
  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);
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
            <Typography variant="h1" component="h1" color="#C9A726">
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

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        ></Box>
      </Box>
    </Box>
  );
};

export default Layout;
