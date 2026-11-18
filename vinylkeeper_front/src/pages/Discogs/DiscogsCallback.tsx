import { useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { iosReturnUrl } from "@utils/NativeLinks";
import { useTranslation } from "react-i18next";

/**
 * Where Discogs sends the user back to. On a phone with the app, the App Link opens the app and
 * this page is never seen. If the link opened in the browser instead (the app is not installed,
 * or the browser did not hand over), the button is a link the system can hand to the app.
 * In the sign-in sheet of the iOS app, the page hands the answer of Discogs straight to the app.
 */
export default function DiscogsCallback() {
  const { t } = useTranslation("discogs");
  const iosReturn = iosReturnUrl(window.location.search);

  useEffect(() => {
    if (iosReturn) window.location.replace(iosReturn);
  }, [iosReturn]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
        textAlign: "center",
      }}
    >
      <Typography variant="h5" component="h1" sx={{ color: "primary.main" }}>
        {t("callback.title")}
      </Typography>
      <Typography>
        {t("callback.text")}
      </Typography>
      <Button variant="contained" href={iosReturn ?? window.location.href}>
        {t("callback.openApp")}
      </Button>
      <Button component={RouterLink} to={EGlobalUrls.COLLECTIONS}>
        {t("callback.collections")}
      </Button>
    </Box>
  );
}
