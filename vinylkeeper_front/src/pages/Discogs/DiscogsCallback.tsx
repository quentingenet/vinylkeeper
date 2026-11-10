import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { EGlobalUrls } from "@utils/GlobalUrls";

/**
 * Where Discogs sends the user back to. On a phone with the app, the App Link opens the app and
 * this page is never seen. If the link opened in the browser instead (the app is not installed,
 * or the browser did not hand over), the button is a link the system can hand to the app.
 */
export default function DiscogsCallback() {
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
        Back from Discogs
      </Typography>
      <Typography>
        This step finishes in the Vinyl Keeper app. If it did not open by itself, tap the button.
      </Typography>
      <Button variant="contained" href={window.location.href}>
        Open the Vinyl Keeper app
      </Button>
      <Button component={RouterLink} to={EGlobalUrls.COLLECTIONS}>
        Go to my collections
      </Button>
    </Box>
  );
}
