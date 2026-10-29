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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: colors.surface,
          color: colors.textLight,
          m: { xs: 1, sm: 2 },
          width: { xs: "calc(100% - 16px)", sm: "auto" },
        },
      }}
    >
      <DialogTitle sx={{ color: "primary.main", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
        Moderation Request Details
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

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
              <Stack spacing={1} sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  Spot information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>City:</strong> {selectedRequest.place?.city},{" "}
                  {selectedRequest.place?.country}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>Description:</strong>{" "}
                  {selectedRequest.place?.description ?? "No description"}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>Current Status:</strong>{" "}
                  {getStatusChip(selectedRequest.status?.name ?? "unknown")}
                </Typography>
              </Stack>

              <Stack spacing={1} sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  Request Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>Submitted by:</strong> {selectedRequest.user?.username}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                  <strong>Submission Date:</strong> {formatDate(selectedRequest.created_at)}
                </Typography>
              </Stack>
            </Stack>

            {selectedRequest.status?.name === "pending" && (
              <Box sx={{ mt: 3, p: 2, bgcolor: colors.panel, borderRadius: 1 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "primary.main", mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  Available Actions
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
                    {isApproving ? "Approving..." : "Approve"}
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
                    {isRejecting ? "Rejecting..." : "Reject"}
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
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
