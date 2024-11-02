import React, { useState } from "react";
import Box from "@mui/material/Box";
import NavBar from "@components/NavBar/NavBar";
import { useTheme } from "@mui/material/styles";
import Footer from "@components/Footer/Footer";

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 210;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const theme = useTheme();
  const toggleMenu = () => setOpen((prev) => !prev);
  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", overflow: "hidden" }}>
      <NavBar open={open} toggleMenu={toggleMenu} />
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          transition: theme.transitions.create(["margin-left", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          width: `calc(100% - ${open ? drawerWidth : theme.spacing(7)}px)`,
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            width: "100%",
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            p: 2,
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
