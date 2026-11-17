import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemIcon,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import { loginUrl, registerUrl } from "@utils/GlobalUrls";
import { growItem } from "@utils/Animations";
import PreviewModal from "@components/Landpage/PreviewModal";
import { previewSlides } from "@components/Landpage/previewSlides";
import { useTranslation } from "react-i18next";


interface JoinVinylKeeperDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** The page to come back to once logged in */
  nextPath?: string;
}

/** Shown to a visitor who tries something a member can do: like a spot, open a shared collection. */
export default function JoinVinylKeeperDialog({
  open,
  onClose,
  title,
  nextPath,
}: JoinVinylKeeperDialogProps) {
  const { t } = useTranslation("atlas");
  const [openPreview, setOpenPreview] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="join-vinyl-keeper-title">
        <DialogTitle
          id="join-vinyl-keeper-title"
          sx={{ color: "primary.main", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}
        >
          {title ?? t("join.title")}
          <IconButton aria-label={t("common:actions.close")} onClick={onClose} sx={{ color: "text.primary" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t("join.intro")}
          </Typography>
          <List dense disablePadding aria-label={t("join.featuresLabel")}>
            {(t("join.features", { returnObjects: true }) as string[]).map((feature) => (
              <ListItem key={feature} disableGutters sx={{ py: 0.25 }}>
                <ListItemIcon sx={{ minWidth: 30, color: "primary.main" }}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2">{feature}</Typography>
              </ListItem>
            ))}
          </List>
          {/* A tour of the app before signing up: the screens of a member */}
          <Link
            component="button"
            type="button"
            underline="none"
            variant="body2"
            onClick={() => setOpenPreview(true)}
            sx={{
              mt: 1.5,
              display: "inline-block",
              // A link styled as a button keeps the browser font otherwise
              fontFamily: "inherit",
              fontWeight: 600,
              color: "primary.main",
              // Always pulsing: it invites the visitor to open the tour
              animation: `${growItem} 2s ease-in-out infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          >
            {t("join.lookInside")}
          </Link>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button component={RouterLink} to={loginUrl(nextPath)} rel="nofollow" variant="text">
              {t("nav:logIn")}
            </Button>
            <Button component={RouterLink} to={registerUrl(nextPath)} rel="nofollow" variant="contained">
              {t("nav:signUp")}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      {/* Over the join popup: closing the tour comes back to it, its last step leads to the login */}
      <PreviewModal
        open={openPreview}
        slides={previewSlides}
        onClose={() => setOpenPreview(false)}
        onEnter={() => void navigate(loginUrl(nextPath))}
        preload={open}
      />
    </>
  );
}
