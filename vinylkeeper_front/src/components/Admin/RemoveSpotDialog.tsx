import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

interface RemoveSpotDialogProps {
  /** The spot to remove; null keeps the dialog closed */
  spot: { id: number; name: string } | null;
  onCancel: () => void;
  onConfirm: (spotId: number) => void;
  isPending: boolean;
}

/** Confirms that a spot leaves the map (soft delete: its open reports are resolved). */
export default function RemoveSpotDialog({ spot, onCancel, onConfirm, isPending }: RemoveSpotDialogProps) {
  return (
    <Dialog open={spot !== null} onClose={onCancel} aria-labelledby="remove-spot-title">
      <DialogTitle id="remove-spot-title">Remove {spot?.name} from the map?</DialogTitle>
      <DialogContent>
        <Typography>
          For a spot that closed for good. It disappears from the Atlas and its open reports are resolved.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button color="error" variant="contained" onClick={() => spot && onConfirm(spot.id)} disabled={isPending}>
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}
