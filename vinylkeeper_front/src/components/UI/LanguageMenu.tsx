import { useState } from "react";
import { Button } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { useLanguagePreference } from "@hooks/useLanguagePreference";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type LanguagePreference } from "@utils/i18n";
// The size of the "Export to" button of a collection; its menu has the one format of the app
import { collectionActionButtonSx } from "@components/Collections/collectionMenuStyles";
import AppMenu from "@components/UI/AppMenu";
import AppMenuItem from "@components/UI/AppMenuItem";

interface LanguageMenuProps {
  sx?: SxProps<Theme>;
}

/** The code of the current language ("FR"), as text: a click lists the languages, as in the settings. */
export default function LanguageMenu({ sx }: LanguageMenuProps) {
  const { t } = useTranslation();
  const { preference, language, choose, isPending } = useLanguagePreference();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
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
      <AppMenu anchorEl={anchor} onClose={() => setAnchor(null)}>
        <AppMenuItem selected={preference === null} onClick={() => pick(null)} label={t("language.automatic")} />
        {SUPPORTED_LANGUAGES.map((code) => (
          <AppMenuItem
            key={code}
            lang={code}
            selected={preference === code}
            onClick={() => pick(code)}
            label={LANGUAGE_NAMES[code]}
          />
        ))}
      </AppMenu>
    </>
  );
}
