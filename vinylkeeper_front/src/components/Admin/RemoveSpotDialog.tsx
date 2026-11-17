import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

interface RemoveSpotDialogProps {
  /** The spot to remove; null keeps the dialog closed */
  spot: { id: number; name: string } | null;
  onCancel: () => void;
  onConfirm: (spotId: number) => void;
  isPending: boolean;
}

/** Confirms that a spot leaves the map (soft delete: its open reports are resolved). */
export default function RemoveSpotDialog({ spot, onCancel, onConfirm, isPending }: RemoveSpotDialogProps) {
  const { t } = useTranslation("admin");
  return (
    <Dialog open={spot !== null} onClose={onCancel} aria-labelledby="remove-spot-title">
      <DialogTitle id="remove-spot-title">{t("remove.title", { name: spot?.name })}</DialogTitle>
      <DialogContent>
        <Typography>
          {t("remove.text")}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t("common:actions.cancel")}</Button>
        <Button color="error" variant="contained" onClick={() => spot && onConfirm(spot.id)} disabled={isPending}>
          {t("remove.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
