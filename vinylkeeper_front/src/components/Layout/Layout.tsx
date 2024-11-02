import React, { useState } from "react";
import Box from "@mui/material/Box";
import NavBar from "@components/NavBar/NavBar";
import { useTheme } from "@mui/material/styles";

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 210;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const theme = useTheme();

  const toggleMenu = () => setOpen((prev) => !prev);

  return (
    <Box sx={{ display: "flex" }}>
      <NavBar open={open} toggleMenu={toggleMenu} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          transition: theme.transitions.create("margin-left", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard,
          }),
          marginLeft: open
            ? `${drawerWidth}px`
            : `calc(${theme.spacing(7)} + 1px)`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
