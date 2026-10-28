import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import type { IAlbumRequestResults } from "@models/IRequestProxy";
import EditionChips from "./EditionChips";

interface ReplacePressingDialogProps {
  pressing: IAlbumRequestResults | null;
  albumTitle: string;
  isPending: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ReplacePressingDialog({
  pressing,
  albumTitle,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ReplacePressingDialogProps) {
  return (
    <Dialog open={pressing !== null} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ color: "primary.main" }}>Is this your pressing?</DialogTitle>
      {pressing && (
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.primary", mb: 2 }}>
            {albumTitle ? `It will replace the pressing of “${albumTitle}” in your collection.` : null}{" "}
            Your copies, their condition and the date you added it are kept.
          </Typography>
          <Typography variant="subtitle2" sx={{ color: "text.primary", mb: 1 }}>
            {pressing.title}
          </Typography>
          <Box mb={1}>
            <EditionChips album={pressing} centered={false} />
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={isPending}>
          This is my pressing
        </Button>
      </DialogActions>
    </Dialog>
  );
}
