import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import type { CollectionUnavailableReason } from "@utils/collectionAvailability";

const SCREENS = {
  private: {
    Icon: LockOutlinedIcon,
    title: "This collection is now private",
    text: "Its owner chose to keep it to themselves, so it can no longer be viewed.",
  },
  gone: {
    Icon: LinkOffIcon,
    title: "This collection no longer exists",
    text: "It may have been deleted by its owner, or the link may be incomplete.",
  },
  error: {
    Icon: CloudOffIcon,
    title: "This collection could not be loaded",
    text: "Check your connection and try again in a moment.",
  },
};

interface CollectionUnavailableProps {
  reason: CollectionUnavailableReason;
  /** What to do next: it differs for a member and for a visitor */
  children?: ReactNode;
}

/** In place of a collection the link of which no longer leads anywhere. */
export default function CollectionUnavailable({ reason, children }: CollectionUnavailableProps) {
  const { Icon, title, text } = SCREENS[reason];

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        px: 2,
        py: 6,
        textAlign: "center",
      }}
    >
      <Icon sx={{ fontSize: 56, color: "primary.main" }} />
      <Typography variant="h5" component="h1" sx={{ color: "primary.main" }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 420 }}>
        {text}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, mt: 1 }}>{children}</Box>
    </Box>
  );
}
