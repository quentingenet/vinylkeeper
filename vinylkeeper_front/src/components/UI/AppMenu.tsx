import type { ReactNode } from "react";
import { Menu } from "@mui/material";
import useDetectMobile from "@hooks/useDetectMobile";
import { menuPaperSx } from "@components/UI/appMenuStyles";

interface AppMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  /** AppMenuItem elements */
  children: ReactNode;
}

/** Every menu opened from a button, in the one format of the app (appMenuStyles). */
export default function AppMenu({ anchorEl, onClose, children }: AppMenuProps) {
  const { isMobile } = useDetectMobile();
  return (
    <Menu
      anchorEl={anchorEl}
      open={anchorEl !== null}
      onClose={onClose}
      slotProps={{ paper: { sx: menuPaperSx(isMobile) }, list: { dense: true } }}
    >
      {children}
    </Menu>
  );
}
