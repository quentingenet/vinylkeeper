import React from "react";
import {
  Drawer,
  Box,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  keyframes,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  SpaceDashboardOutlined as SpaceDashboardOutlinedIcon,
  Album as AlbumIcon,
  AddBox as AddBoxIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  Favorite as FavoriteIcon,
  SwapHoriz as SwapHorizIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";

interface NavBarProps {
  open: boolean;
  toggleMenu: () => void;
  setTitlePage: (title: string) => void;
  titlePage: string;
}

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

const NavBar: React.FC<NavBarProps> = ({
  open,
  toggleMenu,
  setTitlePage,
  titlePage,
}) => {
  const { logout } = useUserContext();

  const handleItemClick = (title: string) => {
    setTitlePage(title);
  };

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
    { text: "Add vinyls", icon: <AddBoxIcon fontSize={sizeIcons} /> },
    { text: "Explore", icon: <SearchIcon fontSize={sizeIcons} /> },
    { text: "Wishlist", icon: <FavoriteIcon fontSize={sizeIcons} /> },
    { text: "Loans", icon: <SwapHorizIcon fontSize={sizeIcons} /> },
    { text: "Community", icon: <GroupIcon fontSize={sizeIcons} /> },
    { text: "Settings", icon: <SettingsIcon fontSize={sizeIcons} /> },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? drawerWidth : 60,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? drawerWidth : 60,
          transition: "width 0.3s ease",
          overflowX: "hidden",
        },
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={1}
        py={1}
      >
        <Typography
          variant="h5"
          fontFamily="RockSalt"
          color={colorYellow}
          sx={{
            textShadow: "2px 2px 4px #000000",
            overflow: "hidden",
            whiteSpace: "nowrap",
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          Vinyl Keeper
        </Typography>
        <IconButton
          onClick={toggleMenu}
          sx={{
            animation: `${growIcon} 1s ease infinite`,
            color: colorYellow,
          }}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List
        sx={{
          paddingY: "2rem",
        }}
      >
        {menuItems.map(({ text, icon }) => (
          <ListItem
            key={text}
            onClick={() => handleItemClick(text)}
            disablePadding
          >
            <ListItemButton
              selected={text === titlePage}
              sx={{
                justifyContent: open ? "initial" : "center",
                gap: "8px",
                height: 70,
              }}
            >
              <ListItemIcon
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  color: colorYellow,
                  minWidth: 0,
                }}
              >
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={text}
                sx={{
                  color: "#fffbf9",
                  opacity: open ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                  whiteSpace: "nowrap",
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box flexGrow={1} />
      <Divider />
      <ListItem disablePadding>
        <ListItemButton
          onClick={logout}
          sx={{
            justifyContent: open ? "initial" : "center",
            alignItems: "center",
            height: 56,
            gap: "8px",
          }}
        >
          <ListItemIcon
            sx={{
              justifyContent: "center",
              color: colorYellow,
              minWidth: 0,
            }}
          >
            <PowerSettingsNewIcon fontSize={sizeIcons} />
          </ListItemIcon>
          <ListItemText
            primary="Logout"
            sx={{
              color: "#fffbf9",
              opacity: open ? 1 : 0,
              transition: "opacity 0.3s ease",
              whiteSpace: "nowrap",
            }}
          />
        </ListItemButton>
      </ListItem>
    </Drawer>
  );
};

export default NavBar;
