import { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import { Delete, Security } from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { userApiService } from "@services/UserApiService";
import { useUserContext } from "@contexts/UserContext";
import { useNavigate } from "react-router-dom";

export default function DangerZoneSection() {
  const { logout } = useUserContext();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteAccountMutation = useMutation({
    mutationFn: () => userApiService.deleteAccount(),
    onSuccess: () => {
      setDialogOpen(false);
      setConfirmation("");
      setDeleteError(null);
      logout();
      setTimeout(() => {
        void navigate("/");
      }, 100);
    },
    onError: (e: Error) => {
      setDeleteError(e?.message || "Failed to delete account. Please try again.");
    },
  });

  return (
    <>
      <Card sx={{ border: "2px solid #f44336" }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Security sx={{ color: "#f44336", mr: 1 }} />
            <Typography variant="h6" color="error">
              Danger zone
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Once you delete your account, it's permanent.
          </Typography>
          <Box display="flex" justifyContent={{ xs: "center", md: "flex-end" }} mx={2}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDialogOpen(true)}
            >
              Delete account
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle color="error">Delete account</DialogTitle>
        <DialogContent>
          <Typography mb={2}>This action cannot be undone.</Typography>
          <TextField
            fullWidth
            placeholder="Type DELETE to confirm"
            label="Confirm deletion"
            value={confirmation}
            onChange={(e) => {
              setConfirmation(e.target.value);
              setDeleteError(null);
            }}
          />
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (confirmation === "DELETE") deleteAccountMutation.mutate();
            }}
            color="error"
            variant="contained"
            disabled={confirmation !== "DELETE" || deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
