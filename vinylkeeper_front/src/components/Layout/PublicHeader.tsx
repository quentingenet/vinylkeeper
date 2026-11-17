import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { EGlobalUrls, loginUrl, registerUrl } from "@utils/GlobalUrls";
import LanguageMenu from "@components/UI/LanguageMenu";

interface PublicHeaderProps {
  /** The page to come back to once logged in */
  nextPath?: string;
}

/** The bar of the pages open to visitors, in place of the menu of the app: they have no account. */
// On a phone the three buttons share the bar with the title: one line each, a smaller text
const headerButtonSx = {
  whiteSpace: "nowrap",
  minWidth: 0,
  px: { xs: 1, md: 1.5 },
  fontSize: { xs: "0.8rem", md: undefined },
} as const;

export default function PublicHeader({ nextPath }: PublicHeaderProps) {
  const { t } = useTranslation("nav");
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: { xs: 1, md: 2 },
        px: { xs: 2, md: 4 },
        py: 1.5,
        backgroundColor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      {/* The h1 of the theme (gold, text shadow) in the font of the home page title, at the size of a bar */}
      <Typography
        component={RouterLink}
        to={EGlobalUrls.ROOT}
        variant="h1"
        sx={{ fontFamily: "RockSalt", fontSize: { xs: "1.2rem", md: "1.6rem" }, textDecoration: "none", m: 0 }}
      >
        {t("brand")}
      </Typography>
      <Box sx={{ display: "flex", gap: { xs: 0.5, md: 1 }, alignItems: "center", flexShrink: 0 }}>
        <LanguageMenu sx={headerButtonSx} />
        <Button component={RouterLink} to={loginUrl(nextPath)} rel="nofollow" size="small" variant="text" sx={headerButtonSx}>
          {t("logIn")}
        </Button>
        <Button component={RouterLink} to={registerUrl(nextPath)} rel="nofollow" size="small" variant="contained" sx={headerButtonSx}>
          {t("signUp")}
        </Button>
      </Box>
    </Box>
  );
}
