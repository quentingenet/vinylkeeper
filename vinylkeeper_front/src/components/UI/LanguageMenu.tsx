import { useState } from "react";
import { Button, ListItemText, Menu, MenuItem } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "@hooks/useLanguagePreference";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type LanguagePreference } from "@utils/i18n";
import { colors } from "@styles/colors";
// The sizes of the "Export to" button of a collection and of its menu
import {
  collectionActionButtonSx,
  collectionMenuPaperSx,
  desktopMenuTextSx,
} from "@components/Collections/collectionMenuStyles";

interface LanguageMenuProps {
  sx?: SxProps<Theme>;
}

/** The code of the current language ("FR"), as text: a click lists the languages, as in the settings. */
export default function LanguageMenu({ sx }: LanguageMenuProps) {
  const { t } = useTranslation();
  const { preference, language, choose, isPending } = useLanguagePreference();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // The size of the Export to menu on a computer, on every screen and page: the mobile theme of the app
  // would make the languages much larger than on the home page. On the component itself: wins over the
  // ListItemText size of the theme
  const itemTextSx = { "& .MuiListItemText-primary": desktopMenuTextSx };
  const itemTextSlotProps = { primary: { variant: "caption" as const } };

  const pick = (next: LanguagePreference) => {
    setAnchor(null);
    choose(next);
  };

  return (
    <>
      <Button
        variant="text"
        size="small"
        color="inherit"
        onClick={(event) => setAnchor(event.currentTarget)}
        disabled={isPending}
        aria-label={t("language.choose", { language: LANGUAGE_NAMES[language] })}
        aria-haspopup="menu"
        aria-expanded={anchor ? "true" : undefined}
        sx={{ ...collectionActionButtonSx, minWidth: 0, ...sx }}
      >
        {language.toUpperCase()}
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{
          paper: {
            // The dark menu of the app on every page: the light theme of the home page would put its
            // white captions on a white menu
            sx: { ...collectionMenuPaperSx(false), bgcolor: colors.paper, color: colors.textLight },
          },
          list: { dense: true },
        }}
      >
        <MenuItem selected={preference === null} onClick={() => pick(null)}>
          <ListItemText primary={t("language.automatic")} sx={itemTextSx} slotProps={itemTextSlotProps} />
        </MenuItem>
        {SUPPORTED_LANGUAGES.map((code) => (
          <MenuItem key={code} lang={code} selected={preference === code} onClick={() => pick(code)}>
            <ListItemText primary={LANGUAGE_NAMES[code]} sx={itemTextSx} slotProps={itemTextSlotProps} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
