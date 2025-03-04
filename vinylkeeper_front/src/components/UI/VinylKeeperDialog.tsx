import { useUserContext } from "@contexts/UserContext";
import { Button } from "@mui/material";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export default function VinylKeeperDialog({
  title,
  content,
  onConfirm,
  textConfirm,
  textCancel,
  open,
  onClose,
}: {
  title: string;
  content: string;
  onConfirm: () => void;
  textConfirm: string;
  textCancel: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" variant="h3" component="h2">
          {title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <DialogActions>
            <Button onClick={onClose}>{textCancel}</Button>
            <Button onClick={onConfirm} autoFocus>
              {textConfirm}
            </Button>
          </DialogActions>
        </DialogActions>
      </Dialog>
    </>
  );
}
