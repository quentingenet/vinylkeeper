import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import NavBar from "@components/NavBar/NavBar";
import MobileNavBar from "@components/NavBar/MobileNavBar";
import { useTheme } from "@mui/material/styles";
import Footer from "@components/Footer/Footer";
import useDetectMobile from "@hooks/useDetectMobile";
import { Typography } from "@mui/material";

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
          maxWidth: "1000px",
          marginX: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            p: 2,
            textAlign: "center",
            mb: 2,
            opacity: isAnimating ? 0 : 1,
            transition: "opacity 0.3s ease, transform 0.3s ease",
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
            p: isMobile ? 1 : 2,
          }}
        >
          <Footer
            setOpenTermsModal={setOpenTermsModal}
            openTermsModal={openTermsModal}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
