import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  keyframes,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  SpaceDashboardOutlined as SpaceDashboardOutlinedIcon,
  Album as AlbumIcon,
  AddBox as AddBoxIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Favorite as FavoriteIcon,
  SwapHoriz as SwapHorizIcon,
  Settings as SettingsIcon,
  ContactMail as ContactMailIcon,
} from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";

const MobileNavBar: React.FC = () => {
  const { logout } = useUserContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const menuItems = [
    {
      text: "Dashboard",
      icon: (
        <SpaceDashboardOutlinedIcon
          fontSize="large"
          sx={{ fontSize: "3rem" }}
        />
      ),
    },
    {
      text: "Collections",
      icon: <AlbumIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Add vinyls",
      icon: <AddBoxIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Explore",
      icon: <SearchIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Community",
      icon: <GroupIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Wishlist",
      icon: <FavoriteIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Loans",
      icon: <SwapHorizIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Settings",
      icon: <SettingsIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Contact",
      icon: <ContactMailIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
    {
      text: "Logout",
      icon: <PowerSettingsNewIcon fontSize="large" sx={{ fontSize: "3rem" }} />,
    },
  ];

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = (text: string) => {
    setActiveItem(text);
    setTimeout(() => setActiveItem(null), 300);
    if (text === "Logout") {
      logout();
    }
  };

  const growIcon = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  `;

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: "#1F1F1F" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleMenuToggle}>
            <MenuIcon
              sx={{
                animation: `${growIcon} 1.3s ease infinite`,
                color: "#C9A726",
              }}
            />
          </IconButton>
          <Typography
            variant="h5"
            fontFamily="Oswald"
            color="#C9A726"
            noWrap
            sx={{ marginX: "auto", textShadow: "2px 2px 4px #000000" }}
          >
            Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={isMenuOpen}
        onClose={handleMenuToggle}
        sx={{
          "& .MuiDrawer-paper": {
            width: "100%",
            height: "100%",
            backgroundColor: "#1F1F1F",
            color: "#fffbf9",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            width: "100%",
            color: "#C9A726",
          }}
        >
          <IconButton onClick={handleMenuToggle} color="inherit">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography
          variant="h4"
          fontFamily="RockSalt"
          color="#C9A726"
          sx={{
            textAlign: "center",
            textShadow: "2px 2px 4px #000000",
            marginX: "auto",
            marginBottom: "1rem",
          }}
        >
          Vinyl Keeper
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 2,
            flexGrow: 1,
            padding: 2,
          }}
        >
          {menuItems.map(({ text, icon }) => (
            <Box key={text} sx={{ display: "flex", justifyContent: "center" }}>
              <ListItemButton
                onClick={() => handleMenuItemClick(text)}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 2,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: "#C9A726",
                    minWidth: 0,
                  }}
                >
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={text}
                  primaryTypographyProps={{
                    variant: "h6",
                    sx: {
                      fontWeight: "bold",
                      textAlign: "center",
                    },
                  }}
                />
              </ListItemButton>
            </Box>
          ))}
        </Box>
      </Drawer>
    </>
  );
};

export default MobileNavBar;
