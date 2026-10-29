import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { LOGIN_URL, REGISTER_URL } from "@utils/GlobalUrls";

const MEMBER_FEATURES = [
  "Catalog your records, their copies and pressings",
  "Import your Discogs collection in 30 seconds",
  "Pick tonight's record with Spinning now",
  "Keep a wishlist and share your collections",
];

interface JoinVinylKeeperDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Shown to a visitor of the public Atlas who tries to like a spot or suggest one. */
export default function JoinVinylKeeperDialog({ open, onClose }: JoinVinylKeeperDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby="join-vinyl-keeper-title">
      <DialogTitle
        id="join-vinyl-keeper-title"
        sx={{ color: "primary.main", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}
      >
        Join Vinyl Keeper to like spots and suggest new ones
        <IconButton aria-label="Close" onClick={onClose} sx={{ color: "text.primary" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Vinyl Keeper is free and open source. With an account you can also:
        </Typography>
        <List dense disablePadding aria-label="What members can do">
          {MEMBER_FEATURES.map((feature) => (
            <ListItem key={feature} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 30, color: "primary.main" }}>
                <CheckCircleOutlineIcon fontSize="small" />
              </ListItemIcon>
              <Typography variant="body2">{feature}</Typography>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Box display="flex" gap={1}>
          <Button component={RouterLink} to={LOGIN_URL} variant="text">
            Log in
          </Button>
          <Button component={RouterLink} to={REGISTER_URL} variant="contained">
            Sign up
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
