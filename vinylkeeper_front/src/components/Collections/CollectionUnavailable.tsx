import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import type { CollectionUnavailableReason } from "@utils/collectionAvailability";
import { useTranslation } from "react-i18next";

// title and text: translation keys
const SCREENS = {
  private: {
    Icon: LockOutlinedIcon,
    title: "collections:unavailable.private.title",
    text: "collections:unavailable.private.text",
  },
  gone: {
    Icon: LinkOffIcon,
    title: "collections:unavailable.notFound.title",
    text: "collections:unavailable.notFound.text",
  },
  error: {
    Icon: CloudOffIcon,
    title: "collections:unavailable.error.title",
    text: "collections:unavailable.error.text",
  },
};

interface CollectionUnavailableProps {
  reason: CollectionUnavailableReason;
  /** What to do next: it differs for a member and for a visitor */
  children?: ReactNode;
}

/** In place of a collection the link of which no longer leads anywhere. */
export default function CollectionUnavailable({ reason, children }: CollectionUnavailableProps) {
  const { t } = useTranslation();
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
        {t(title)}
      </Typography>
      <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 420 }}>
        {t(text)}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, mt: 1 }}>{children}</Box>
    </Box>
  );
}
