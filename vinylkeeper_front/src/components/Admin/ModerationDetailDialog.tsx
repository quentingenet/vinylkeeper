import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import { CheckCircle, Cancel } from "@mui/icons-material";
import { ModerationRequest } from "@services/AdminApiService";
import { getStatusChip, formatDate } from "./adminUtils";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedRequest: ModerationRequest | null;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}

export default function ModerationDetailDialog({
  open,
  onClose,
  selectedRequest,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: Props) {
  const { t } = useTranslation("admin");
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: colors.surface,
            color: colors.textLight,
            m: { xs: 1, sm: 2 },
            width: { xs: "calc(100% - 16px)", sm: "auto" },
          },
        },
      }}
    >
      <DialogTitle sx={{ color: "primary.main", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
        {t("detail.title")}
      </DialogTitle>
      <DialogContent>
        {selectedRequest && (
          <Box>
            <Typography
              variant="h6"
              sx={{ color: "primary.main", mb: 2, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
            >
              {selectedRequest.place?.name}
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
              <Stack spacing={1} sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {t("detail.spot")}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>{t("detail.city")}</strong> {selectedRequest.place?.city},{" "}
                  {selectedRequest.place?.country}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>{t("detail.description")}</strong>{" "}
                  {selectedRequest.place?.description ?? t("detail.noDescription")}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>{t("detail.status")}</strong>{" "}
                  {getStatusChip(selectedRequest.status?.name ?? "unknown")}
                </Typography>
              </Stack>

              <Stack spacing={1} sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {t("detail.request")}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>{t("detail.submittedBy")}</strong> {selectedRequest.user?.username}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>{t("detail.date")}</strong> {formatDate(selectedRequest.created_at)}
                </Typography>
              </Stack>
            </Stack>

            {selectedRequest.status?.name === "pending" && (
              <Box sx={{ mt: 3, p: 2, bgcolor: colors.panel, borderRadius: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {t("detail.actions")}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<CheckCircle />}
                    onClick={onApprove}
                    disabled={isApproving}
                    sx={{
                      bgcolor: colors.success,
                      "&:hover": { bgcolor: colors.successDark },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {isApproving ? t("detail.approving") : t("detail.approve")}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<Cancel />}
                    onClick={onReject}
                    disabled={isRejecting}
                    sx={{
                      bgcolor: colors.error,
                      "&:hover": { bgcolor: colors.errorDark },
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {isRejecting ? t("detail.rejecting") : t("detail.reject")}
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{ color: "primary.main", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
        >
          {t("common:actions.close")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
