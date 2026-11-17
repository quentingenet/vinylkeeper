import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("collections");
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common:actions.cancel")}</Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          disabled={isPending}
        >
          {isPending ? t("confirm.removing") : t("confirm.remove")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
