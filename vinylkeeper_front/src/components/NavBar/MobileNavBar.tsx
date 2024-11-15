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

interface MobileNavBarProps {
  setTitlePage: (title: string) => void;
  titlePage: string;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({
  setTitlePage,
  titlePage,
}) => {
  const { logout } = useUserContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  const colorYellow = "#C9A726";
  const sizeIcons = "large";

  const menuItems = [
    {
      text: "Dashboard",
      icon: <SpaceDashboardOutlinedIcon fontSize={sizeIcons} />,
    },
    {
      text: "Collections",
      icon: <AlbumIcon fontSize={sizeIcons} />,
    },
    {
      text: "Add vinyls",
      icon: <AddBoxIcon fontSize={sizeIcons} />,
    },
    {
      text: "Explore",
      icon: <SearchIcon fontSize={sizeIcons} />,
    },
    {
      text: "Wishlist",
      icon: <FavoriteIcon fontSize={sizeIcons} />,
    },
    {
      text: "Loans",
      icon: <SwapHorizIcon fontSize={sizeIcons} />,
    },
    {
      text: "Community",
      icon: <GroupIcon fontSize={sizeIcons} />,
    },
    {
      text: "Settings",
      icon: <SettingsIcon fontSize={sizeIcons} />,
    },
    {
      text: "Contact",
      icon: <ContactMailIcon fontSize={sizeIcons} />,
    },
    {
      text: "Logout",
      icon: <PowerSettingsNewIcon fontSize={sizeIcons} />,
    },
  ];

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMenuItemClick = (text: string) => {
    setActiveItem(text);
    setTitlePage(text);
    setTimeout(() => {
      setIsMenuOpen(false);
      setActiveItem(null);
    }, 200);

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
                color: colorYellow,
              }}
            />
          </IconButton>
          <Typography
            variant="h5"
            fontFamily="Oswald"
            color={colorYellow}
            noWrap
            sx={{ marginX: "auto", textShadow: "2px 2px 4px #000000" }}
          >
            {titlePage}
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
            backgroundColor: "#000000",
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
            color: { colorYellow },
          }}
        >
          <IconButton onClick={handleMenuToggle} color="inherit">
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography
          variant="h4"
          fontFamily="RockSalt"
          color={colorYellow}
          sx={{
            textAlign: "center",
            textShadow: "2px 2px 4px #000000",
            marginX: "auto",
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
            paddingY: 5,
          }}
        >
          {menuItems.map(({ text, icon }) => (
            <Box key={text} sx={{ display: "flex", justifyContent: "center" }}>
              <ListItemButton
                onClick={() => handleMenuItemClick(text)}
                selected={text === titlePage}
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
                    color: colorYellow,
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
