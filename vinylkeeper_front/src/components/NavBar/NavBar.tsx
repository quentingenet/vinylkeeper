import React from "react";
import { styled, Theme, CSSObject, keyframes } from "@mui/material/styles";
import Box from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SpaceDashboardOutlinedIcon from "@mui/icons-material/SpaceDashboardOutlined";
import AlbumIcon from "@mui/icons-material/Album";
import AddBoxIcon from "@mui/icons-material/AddBox";
import SearchIcon from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import FavoriteIcon from "@mui/icons-material/Favorite";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import StarIcon from "@mui/icons-material/Star";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import { useUserContext } from "@contexts/UserContext";

const drawerWidth = 240;

const growIcon = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  width: `calc(${theme.spacing(7)} + 1px)`,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

interface NavBarProps {
  open: boolean;
  toggleMenu: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ open, toggleMenu }) => {
  const { logout } = useUserContext();

  const Drawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) => prop !== "open",
  })(({ theme, open }) => ({
    width: open ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    ...(open && {
      ...openedMixin(theme),
      "& .MuiDrawer-paper": openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      "& .MuiDrawer-paper": closedMixin(theme),
    }),
  }));

  const StyledList = styled(List)({
    "& .MuiListItemText-primary": {
      fontSize: "1.1rem",
      color: "#C9A726",
    },
  });

  const menuItems = [
    { text: "Dashboard", icon: <SpaceDashboardOutlinedIcon /> },
    { text: "My Collection", icon: <AlbumIcon /> },
    { text: "Add Vinyls", icon: <AddBoxIcon /> },
    { text: "Explore", icon: <SearchIcon /> },
    { text: "Community", icon: <GroupIcon /> },
    { text: "Wishlist", icon: <FavoriteIcon /> },
    { text: "Loans", icon: <SwapHorizIcon /> },
    { text: "Settings", icon: <SettingsIcon /> },
  ];

  return (
    <Drawer variant="permanent" open={open}>
      <DrawerHeader>
        {open && (
          <Typography
            variant="h5"
            fontFamily="RockSalt"
            color="#C9A726"
            noWrap
            sx={{ marginX: "auto", textShadow: "2px 2px 4px #000000" }}
          >
            Vinyl Keeper
          </Typography>
        )}
        <IconButton
          sx={{ animation: `${growIcon} 1s ease infinite`, color: "#C9A726" }}
          onClick={toggleMenu}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {menuItems.map(({ text, icon }) => (
          <ListItem key={text} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              sx={{
                minHeight: 60,
                justifyContent: open ? "initial" : "center",
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 3 : "auto",
                  justifyContent: "center",
                  color: "#C9A726",
                }}
              >
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={text}
                sx={{ fontSize: "3rem", opacity: open ? 1 : 0 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <ListItem disablePadding sx={{ display: "block" }}>
        <ListItemButton onClick={logout} sx={{ minHeight: 48, px: 2.5 }}>
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: open ? 3 : "auto",
              justifyContent: "center",
            }}
          >
            <PowerSettingsNewIcon sx={{ color: "#C9A726" }} />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ opacity: open ? 1 : 0 }} />
        </ListItemButton>
      </ListItem>
    </Drawer>
  );
};

export default NavBar;
