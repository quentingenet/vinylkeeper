import { Box, Typography } from "@mui/material";

export default function Places() {
  return (
    <Box p={3} sx={{ backgroundColor: "#313132", color: "#e4e4e4" }}>
      <Typography
        variant="h6"
        component="div"
        sx={{ textAlign: "center", fontWeight: "bold" }}
      >
        📍 Discover & share vinyl places around the world with the community{" "}
        <br />
        by posting your favorite vinyl stores, record fairs, and more, <br />
        on an interactive map. (coming soon)
      </Typography>
    </Box>
  );
}
