import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { EGlobalUrls, loginUrl, registerUrl } from "@utils/GlobalUrls";

interface PublicHeaderProps {
  /** The page to come back to once logged in */
  nextPath?: string;
}

/** The bar of the pages open to visitors, in place of the menu of the app: they have no account. */
export default function PublicHeader({ nextPath }: PublicHeaderProps) {
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
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button component={RouterLink} to={loginUrl(nextPath)} size="small" variant="text">
          Log in
        </Button>
        <Button component={RouterLink} to={registerUrl(nextPath)} size="small" variant="contained">
          Sign up
        </Button>
      </Box>
    </Box>
  );
}
