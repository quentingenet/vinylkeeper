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
} from "@mui/material";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  SpaceDashboardOutlined as SpaceDashboardOutlinedIcon,
  Album as AlbumIcon,
  GraphicEq as GraphicEqIcon,
  AddBox as AddBoxIcon,
  Public as PublicIcon,
  Settings as SettingsIcon,
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
 * MobileNavBar component props interface
 * @interface MobileNavBarProps
 * @property {(titleKey: string) => void} setTitlePage - Sets the translation key of the title of the page
 * @property {string} titlePage - Translation key of the current title of the page
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
  const [_activeItem, setActiveItem] = useState<string | null>(null);
  const navigate = useNavigate();
  const { openAddRecord } = useAddRecord();
  const { t } = useTranslation();

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
      labelKey: "nav:items.addRecord",
      icon: <AddBoxIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.ADD_VINYLS,
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
    {
      labelKey: "nav:items.logout",
      icon: <PowerSettingsNewIcon fontSize={sizeIcons} />,
      linkTo: EGlobalUrls.ROOT,
    },
  ];

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  /**
   * Handles the click event for a menu item
   * @param {string} labelKey - The translation key of the menu item
   * @param {EGlobalUrls} linkTo - The URL to navigate to
   */
  const handleMenuItemClick = (labelKey: string, linkTo: EGlobalUrls) => {
    // Adding a record is a dialog over the current page, not a page of its own
    if (linkTo === EGlobalUrls.ADD_VINYLS) {
      setIsMenuOpen(false);
      openAddRecord();
      return;
    }
    setActiveItem(labelKey);
    setTitlePage(labelKey);
    setTimeout(() => {
      setIsMenuOpen(false);
      setActiveItem(null);
    }, 200);

    if (labelKey === "nav:items.logout") {
      logout();
    }
    void navigate(linkTo);
  };

  return (
    <>
      <AppBar position="fixed" sx={{ backgroundColor: colors.deep, pt: "var(--safe-top)" }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleMenuToggle} aria-label={t("nav:openMenu")}>
            <MenuIcon
              sx={{
                animation: `${growItem} 1.3s ease infinite`,
                color: colorYellow,
              }}
            />
          </IconButton>
          <Typography
            variant="h5"
            noWrap
            sx={{ color: colorYellow, fontFamily: "Oswald", marginX: "auto", textShadow: `2px 2px 4px ${colors.black}` }}
          >
            {t(titlePage)}
          </Typography>
          <LanguageMenu sx={{ color: colorYellow }} />
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
            backgroundColor: colors.black,
            color: colors.textLight,
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
          <IconButton onClick={handleMenuToggle} color="inherit" aria-label={t("nav:closeMenu")}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Typography
          variant="h4"
          sx={{
            color: colorYellow,
            fontFamily: "RockSalt",
            textAlign: "center",
            textShadow: `2px 2px 4px ${colors.black}`,
            marginX: "auto",
          }}
        >
          {t("nav:brand")}
        </Typography>

        <Box
          sx={{
            display: "grid",
            // minmax(0, 1fr): a long label cannot widen its column past half the screen
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 2,
            flexGrow: 1,
            paddingY: 5,
          }}
        >
          {menuItems.map(({ labelKey, icon, linkTo }, index) => (
            <Box
              key={labelKey}
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
                onClick={() => handleMenuItemClick(labelKey, linkTo)}
                selected={labelKey === titlePage}
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
                  primary={t(labelKey)}
                  sx={{ minWidth: 0, width: "100%" }}
                  slotProps={{
                    primary: {
                      variant: "h6",
                      sx: {
                        fontWeight: "bold",
                        textAlign: "center",
                        // Safeguard for a label longer than its cell (some languages): an ellipsis
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      },
                    },
                  }}
                />
              </ListItemButton>
            </Box>
          ))}
        </Box>
        <AppVersion />
      </Drawer>
    </>
  );
};

export default MobileNavBar;
