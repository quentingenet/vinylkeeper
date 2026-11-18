import type { ReactNode } from "react";
import { ListItemIcon, ListItemText, MenuItem, type MenuItemProps } from "@mui/material";
import useDetectMobile from "@hooks/useDetectMobile";
import { menuIconSx, menuItemTextSx } from "@components/UI/appMenuStyles";

interface AppMenuItemProps extends Omit<MenuItemProps, "children"> {
  label: ReactNode;
  icon?: ReactNode;
}

/** A row of an AppMenu: an optional icon and its text, in the one format of the app. */
export default function AppMenuItem({ label, icon, ...menuItemProps }: AppMenuItemProps) {
  const { isMobile } = useDetectMobile();
  return (
    <MenuItem {...menuItemProps}>
      {icon && <ListItemIcon sx={menuIconSx}>{icon}</ListItemIcon>}
      <ListItemText primary={label} sx={menuItemTextSx(isMobile)} slotProps={{ primary: { variant: "caption" } }} />
    </MenuItem>
  );
}
