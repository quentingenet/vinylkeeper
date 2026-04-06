import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";

interface ConfirmDeleteDialogProps {
  open: boolean;
  title: string;
  message: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmDeleteDialog({
  open,
  title,
  message,
  isPending,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isPending}
        >
          {isPending ? "Removing..." : "Remove"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
