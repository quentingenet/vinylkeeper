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
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  SpaceDashboardOutlined as SpaceDashboardOutlinedIcon,
  Album as AlbumIcon,
  GraphicEq as GraphicEqIcon,
  AddBox as AddBoxIcon,
  Settings as SettingsIcon,
  Public as PublicIcon,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useUserContext } from "@contexts/UserContext";
import { useAddRecord } from "@contexts/AddRecordContext";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageMenu from "@components/UI/LanguageMenu";
import { growItem } from "@utils/Animations";
import { colors } from "@styles/colors";
import AppVersion from "@components/UI/AppVersion";

/**
 * NavBar component props interface
 * @interface NavBarProps
 * @property {boolean} open - Whether the drawer is open or not
 * @property {() => void} toggleMenu - Function to toggle the drawer
 * @property {(titleKey: string) => void} setTitlePage - Sets the translation key of the title of the page
 * @property {string} titlePage - Translation key of the current title of the page
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
  const { logout, currentUser } = useUserContext();
  const { openAddRecord } = useAddRecord();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // The menu entry hovered whose label is cut by an ellipsis: its tooltip gives the whole label
  const [truncatedLabel, setTruncatedLabel] = React.useState<string | null>(null);
  const tooltipIfTruncated = (labelKey: string) => ({
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      const text = event.currentTarget.querySelector<HTMLElement>(".MuiListItemText-primary");
      setTruncatedLabel(text && text.scrollWidth > text.clientWidth ? labelKey : null);
    },
    onMouseLeave: () => setTruncatedLabel(null),
  });

  const handleItemClick = (titleKey: string, linkTo: EGlobalUrls) => {
    // Adding a record is a dialog over the current page, not a page of its own
    if (linkTo === EGlobalUrls.ADD_VINYLS) {
      openAddRecord();
      return;
    }
    setTitlePage(titleKey);
    void navigate(linkTo);
  };

  const colorYellow = colors.gold;
  const sizeIcons = "large";

  // Check if user has admin permissions
  const isAdmin = currentUser?.is_admin === true;

  const menuItems = [
    {
      labelKey: "nav:items.dashboard",
      icon: <SpaceDashboardOutlinedIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.DASHBOARD,
    },
    {
      labelKey: "nav:items.addRecord",
      icon: <AddBoxIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.ADD_VINYLS,
    },
    {
      labelKey: "nav:items.collections",
      icon: <AlbumIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.COLLECTIONS,
    },
    {
      labelKey: "nav:items.spinningNow",
      icon: <GraphicEqIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.SPINNING_NOW,
    },
    {
      labelKey: "nav:items.atlas",
      icon: <PublicIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.ATLAS,
    },
    {
      labelKey: "nav:items.settings",
      icon: <SettingsIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.SETTINGS,
    },
    // Only show Admin if user is admin AND superuser
    ...(isAdmin
      ? [
          {
            labelKey: "nav:items.admin",
            icon: <AdminPanelSettings fontSize={sizeIcons} />,
            linkTo: EGlobalUrls.ADMIN,
          },
        ]
      : []),
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
        onClick={toggleMenu}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 1,
          py: 1,
          cursor: "pointer",
          transition: "background-color 0.3s ease",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: colorYellow,
            fontFamily: "RockSalt",
            textShadow: `2px 2px 4px ${colors.black}`,
            overflow: "hidden",
            whiteSpace: "nowrap",
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          {t("nav:brand")}
        </Typography>
        <IconButton
          aria-label={t("nav:toggleMenu")}
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
        {menuItems.map(({ labelKey, icon, linkTo }) => (
          <ListItem
            key={labelKey}
            onClick={() => handleItemClick(labelKey, linkTo)}
            disablePadding
          >
            <Tooltip title={t(labelKey)} placement="right" open={open && truncatedLabel === labelKey}>
            <ListItemButton
              {...tooltipIfTruncated(labelKey)}
              selected={labelKey === titlePage}
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
                primary={t(labelKey)}
                sx={{
                  color: colors.textLight,
                  opacity: open ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                  whiteSpace: "nowrap",
                  // Safeguard for a label longer than the menu (some languages): an ellipsis
                  minWidth: 0,
                  "& .MuiListItemText-primary": { overflow: "hidden", textOverflow: "ellipsis" },
                }}
              />
            </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      {/* Logout and, on its right past a divider, the language: one row at the bottom of the menu */}
      <Box sx={{ display: "flex", alignItems: "stretch" }}>
      <ListItem disablePadding sx={{ flex: 1, minWidth: 0 }}>
        <Tooltip title={t("nav:items.logout")} placement="right" open={open && truncatedLabel === "nav:items.logout"}>
        <ListItemButton
          {...tooltipIfTruncated("nav:items.logout")}
          onClick={logout}
          sx={{
            // Folded: the icon with the version under it, both centered on the 60px of the menu
            flexDirection: open ? "row" : "column",
            justifyContent: open ? "initial" : "center",
            alignItems: "center",
            // Taller than the other rows: the version has its own line under the label or the icon
            height: 72,
            pb: open ? "18px" : 0,
            gap: open ? "8px" : "6px",
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
            primary={t("nav:items.logout")}
            sx={{
              color: colors.textLight,
              opacity: open ? 1 : 0,
              transition: "opacity 0.3s ease",
              whiteSpace: "nowrap",
              // Invisible is not enough when folded: its width would push the icon off center
              display: open ? undefined : "none",
              // Safeguard for a label longer than the room left by the language button: an ellipsis
              minWidth: 0,
              "& .MuiListItemText-primary": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
          {/* In the logout button, on its own line: bottom right when unfolded, right under the icon when folded */}
          {open ? <AppVersion corner /> : <AppVersion inline />}
        </ListItemButton>
        </Tooltip>
      </ListItem>
      {/* Folded to icons the menu is 60px wide: the language waits for it to be unfolded */}
      {open && (
        <>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", px: 1 }}>
            <LanguageMenu sx={{ color: colors.textLight }} />
          </Box>
        </>
      )}
      </Box>
    </Drawer>
  );
};

export default NavBar;
