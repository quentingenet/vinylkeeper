import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { EGlobalUrls, LOGIN_URL, REGISTER_URL } from "@utils/GlobalUrls";

/** The bar of the public Atlas, in place of the menu of the app: visitors have no account. */
export default function PublicAtlasHeader() {
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
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
        Vinyl Keeper
      </Typography>
      <Box display="flex" gap={1}>
        <Button component={RouterLink} to={LOGIN_URL} size="small" variant="text">
          Log in
        </Button>
        <Button component={RouterLink} to={REGISTER_URL} size="small" variant="contained">
          Sign up
        </Button>
      </Box>
    </Box>
  );
}
