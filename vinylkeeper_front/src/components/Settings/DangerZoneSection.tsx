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
import { useTranslation } from "react-i18next";
import { userApiService } from "@services/UserApiService";
import { useUserContext } from "@contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { colors } from "@styles/colors";

export default function DangerZoneSection() {
  const { t } = useTranslation("settings");
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
      setDeleteError(e?.message || t("danger.error"));
    },
  });

  return (
    <>
      <Card sx={{ border: `2px solid ${colors.error}` }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Security sx={{ color: colors.error, mr: 1 }} />
            <Typography variant="h6" color="error">
              {t("danger.title")}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            {t("danger.warning")}
          </Typography>
          <Box sx={{ display: "flex", justifyContent: { xs: "center", md: "flex-end" }, mx: 2 }}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDialogOpen(true)}
            >
              {t("danger.delete")}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle color="error">{t("danger.delete")}</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{t("danger.cannotUndo")}</Typography>
          <TextField
            fullWidth
            placeholder={t("danger.placeholder")}
            label={t("danger.confirmLabel")}
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
          <Button onClick={() => setDialogOpen(false)}>{t("common:actions.cancel")}</Button>
          <Button
            onClick={() => {
              if (confirmation === "DELETE") deleteAccountMutation.mutate();
            }}
            color="error"
            variant="contained"
            disabled={confirmation !== "DELETE" || deleteAccountMutation.isPending}
          >
            {deleteAccountMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
