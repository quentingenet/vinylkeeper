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
  AdminPanelSettings,
} from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { useNavigate } from "react-router-dom";
import { growItem } from "@utils/Animations";

/**
 * MobileNavBar component props interface
 * @interface MobileNavBarProps
 * @property {() => void} setTitlePage - Function to set the title of the page
 * @property {string} titlePage - The current title of the page
 */
interface MobileNavBarProps {
  setTitlePage: (title: string) => void;
  titlePage: string;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({
  setTitlePage,
  titlePage,
}) => {
  const { logout, currentUser } = useUserContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const navigate = useNavigate();

  const colorYellow = "#C9A726";
  const sizeIcons = "large";

  // Check if user has admin permissions
  const isAdmin = currentUser?.is_admin === true;

  const menuItems = [
    {
      text: "Dashboard",
      icon: <SpaceDashboardOutlinedIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.DASHBOARD,
    },
    {
      text: "Collections",
      icon: <AlbumIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.COLLECTIONS,
    },
    {
      text: "Add vinyls",
      icon: <AddBoxIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.ADD_VINYLS,
    },
    {
      text: "Explore",
      icon: <SearchIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.EXPLORE,
    },
    {
      text: "Places",
      icon: <SwapHorizIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.PLACES,
    },
    {
      text: "Settings",
      icon: <SettingsIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.SETTINGS,
    },
    // Only show Admin if user is admin AND superuser
    ...(isAdmin
      ? [
          {
            text: "Admin",
            icon: <AdminPanelSettings fontSize={sizeIcons} />,
            linkTo: EGlobalUrls.ADMIN,
          },
        ]
      : []),
    {
      text: "Logout",
      icon: <PowerSettingsNewIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.ROOT,
    },
  ];

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  /**
   * Handles the click event for a menu item
   * @param {string} text - The text of the menu item
   * @param {EGlobalUrls} linkTo - The URL to navigate to
   */
  const handleMenuItemClick = (text: string, linkTo: EGlobalUrls) => {
    setActiveItem(text);
    setTitlePage(text);
    setTimeout(() => {
      setIsMenuOpen(false);
      setActiveItem(null);
    }, 200);

    if (text === "Logout") {
      logout();
    }
    navigate(linkTo);
  };

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: "#1F1F1F" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleMenuToggle}>
            <MenuIcon
              sx={{
                animation: `${growItem} 1.3s ease infinite`,
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
          {menuItems.map(({ text, icon, linkTo }, index) => (
            <Box
              key={text}
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gridColumn:
                  index === menuItems.length - 1 && menuItems.length % 2 === 1
                    ? "1 / -1"
                    : "auto",
              }}
            >
              <ListItemButton
                onClick={() => handleMenuItemClick(text, linkTo)}
                selected={text === titlePage}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 2,
                  width:
                    index === menuItems.length - 1 && menuItems.length % 2 === 1
                      ? "50%"
                      : "100%",
                  marginX:
                    index === menuItems.length - 1 && menuItems.length % 2 === 1
                      ? "auto"
                      : 0,
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
