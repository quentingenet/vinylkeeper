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
import { EGlobalUrls } from "@utils/GlobalUrls";
import { useNavigate } from "react-router-dom";
import { growItem } from "@utils/Animations";

/**
 * NavBar component props interface
 * @interface NavBarProps
 * @property {boolean} open - Whether the drawer is open or not
 * @property {() => void} toggleMenu - Function to toggle the drawer
 * @property {(title: string) => void} setTitlePage - Function to set the title of the page
 * @property {string} titlePage - The current title of the page
 */
interface NavBarProps {
  open: boolean;
  toggleMenu: () => void;
  setTitlePage: (title: string) => void;
  titlePage: string;
}

const drawerWidth = 240;

/**
 * NavBar component that provides the navigation menu for the application
 * @component
 * @param {NavBarProps} props - Component props
 * @returns {JSX.Element} NavBar component with navigation menu
 */
const NavBar: React.FC<NavBarProps> = ({
  open,
  toggleMenu,
  setTitlePage,
  titlePage,
}) => {
  const { logout } = useUserContext();
  const navigate = useNavigate();

  const handleItemClick = (title: string, linkTo: EGlobalUrls) => {
    setTitlePage(title);
    navigate(linkTo);
  };

  const colorYellow = "#C9A726";
  const sizeIcons = "large";

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
      text: "Wishlist",
      icon: <FavoriteIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.WISHLIST,
    },
    {
      text: "Loans",
      icon: <SwapHorizIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.LOANS,
    },
    {
      text: "Community",
      icon: <GroupIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.COMMUNITY,
    },
    {
      text: "Settings",
      icon: <SettingsIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.SETTINGS,
    },
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
            animation: `${growItem} 1s ease infinite`,
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
        {menuItems.map(({ text, icon, linkTo }) => (
          <ListItem
            key={text}
            onClick={() => handleItemClick(text, linkTo)}
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
