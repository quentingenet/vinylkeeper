import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  Card,
  CardContent,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Snackbar,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Visibility,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@utils/queryKeys";
import { adminApiService, ModerationRequest } from "@services/AdminApiService";
import { useUserContext } from "@contexts/UserContext";
import useDetectMobile from "@hooks/useDetectMobile";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const Admin: React.FC = () => {
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();
  const queryClient = useQueryClient();

  const [selectedRequest, setSelectedRequest] =
    useState<ModerationRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [moderationActionError, setModerationActionError] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  // Pagination state — "All Requests" table
  const [allPage, setAllPage] = useState(0); // MUI TablePagination is 0-indexed
  const [allRowsPerPage, setAllRowsPerPage] = useState(10);

  // Pagination state — "Pending Requests" table
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);

  const isAdmin = currentUser?.is_admin === true;

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return "An unexpected error occurred. Please try again.";
  };

  // Fetch all moderation requests (paginated)
  const {
    data: moderationData,
    isLoading: isLoadingRequests,
    error: requestsError,
  } = useQuery({
    queryKey: queryKeys.moderation.list(allPage + 1, allRowsPerPage),
    queryFn: () => adminApiService.getModerationRequests(allPage + 1, allRowsPerPage),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch pending requests (paginated)
  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: queryKeys.moderation.pendingList(pendingPage + 1, pendingRowsPerPage),
    queryFn: () => adminApiService.getPendingModerationRequests(pendingPage + 1, pendingRowsPerPage),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: queryKeys.moderation.stats(),
    queryFn: () => adminApiService.getModerationStats(),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const invalidateModerationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.pending() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.stats() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all(), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.map(), refetchType: "all" }),
    ]);
  };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      adminApiService.approveModerationRequest(requestId),
    onSuccess: async () => {
      await invalidateModerationQueries();
      setModerationActionError(null);
      setFeedback({ open: true, severity: "success", message: "Moderation request approved." });
      setDetailDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      setModerationActionError(message);
      setFeedback({ open: true, severity: "error", message });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: number) =>
      adminApiService.rejectModerationRequest(requestId),
    onSuccess: async () => {
      await invalidateModerationQueries();
      setModerationActionError(null);
      setFeedback({ open: true, severity: "success", message: "Moderation request rejected." });
      setDetailDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      setModerationActionError(message);
      setFeedback({ open: true, severity: "error", message });
    },
  });

  const handleViewDetails = (request: ModerationRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
    setModerationActionError(null);
  };

  const handleApprove = () => {
    if (selectedRequest) {
      setModerationActionError(null);
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
      setModerationActionError(null);
      rejectMutation.mutate(selectedRequest.id);
    }
  };

  const getStatusChip = (statusName: string) => {
    switch (statusName) {
      case "pending":
        return <Chip label="Pending" color="warning" size="small" />;
      case "approved":
        return <Chip label="Approved" color="success" size="small" />;
      case "rejected":
        return <Chip label="Rejected" color="error" size="small" />;
      default:
        return <Chip label={statusName} size="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const tablePaginationSx = {
    color: "#fffbf9",
    "& .MuiTablePagination-selectIcon": { color: "#C9A726" },
    "& .MuiTablePagination-actions button": { color: "#C9A726" },
    "& .MuiTablePagination-actions button.Mui-disabled": { color: "#555" },
    "& .MuiSelect-select": { color: "#fffbf9" },
  };

  if (!isAdmin) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <AdminPanelSettings sx={{ fontSize: 64, color: "#C9A726", mb: 2 }} />
        <Typography variant="h4" sx={{ color: "#C9A726", mb: 2 }}>
          Administrator Access Required
        </Typography>
        <Typography variant="body1" sx={{ color: "#fffbf9", textAlign: "center" }}>
          You must have administrator privileges to access this page.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 2, md: 3 },
        maxWidth: isMobile ? "100dvw" : "1200px",
        margin: "0 auto",
      }}
    >
      <Snackbar
        open={feedback.open}
        autoHideDuration={4500}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={feedback.severity}
          variant="filled"
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: "flex", alignItems: "center", mb: 3, flexWrap: "wrap" }}>
        <AdminPanelSettings
          sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: "#C9A726", mr: 2 }}
        />
        <Typography
          variant="h4"
          sx={{
            color: "#C9A726",
            fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
          }}
        >
          Administration
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Box justifyContent="center">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: { xs: 1, sm: 2 },
            justifyContent: "center",
            justifyItems: "center",
            mb: 4,
            mx: "auto",
            maxWidth: "800px",
          }}
        >
          {[
            { label: "Total", value: stats?.total, color: "#C9A726" },
            { label: "Pending", value: stats?.pending, color: "#ff9800" },
            { label: "Approved", value: stats?.approved, color: "#4caf50" },
            { label: "Rejected", value: stats?.rejected, color: "#f44336" },
          ].map(({ label, value, color }) => (
            <Card
              key={label}
              sx={{
                bgcolor: "#3f3f41",
                color: "#fffbf9",
                width: { xs: "40%", sm: "100%" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
              }}
            >
              <CardContent sx={{ textAlign: "center", width: "100%", p: { xs: 1, sm: 2 } }}>
                <Typography
                  variant="h6"
                  sx={{ color, fontSize: { xs: "0.875rem", sm: "1.25rem" } }}
                >
                  {label}
                </Typography>
                <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}>
                  {isLoadingStats ? <CircularProgress size={24} /> : (value ?? 0)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      {/* Error Alerts */}
      {requestsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading moderation requests
        </Alert>
      )}
      {moderationActionError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {moderationActionError}
        </Alert>
      )}

      {/* Pending Requests Section */}
      <Typography
        variant="h5"
        sx={{ color: "#C9A726", mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
      >
        Pending Requests ({pendingData?.total ?? 0})
      </Typography>

      {isLoadingPending ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : pendingData && pendingData.items.length > 0 ? (
        <Paper sx={{ bgcolor: "#3f3f41", mb: 4, overflowX: "auto" }}>
          <TableContainer>
            <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
              <TableHead>
                <TableRow>
                  {["Place", "City", "User", "Date", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      sx={{ color: "#C9A726", fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingData.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {request.place?.name ?? "N/A"}
                    </TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {request.place?.city}, {request.place?.country}
                    </TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {request.user?.username ?? "N/A"}
                    </TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleViewDetails(request)} sx={{ color: "#C9A726" }} size="small">
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={pendingData.total}
            page={pendingPage}
            rowsPerPage={pendingRowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            onPageChange={(_e, newPage) => setPendingPage(newPage)}
            onRowsPerPageChange={(e) => {
              setPendingRowsPerPage(parseInt(e.target.value, 10));
              setPendingPage(0);
            }}
            sx={tablePaginationSx}
          />
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          No pending requests
        </Alert>
      )}

      {/* All Requests Section */}
      <Typography
        variant="h5"
        sx={{ color: "#C9A726", mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
      >
        All Requests ({moderationData?.total ?? 0})
      </Typography>

      {isLoadingRequests ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : moderationData ? (
        <Paper sx={{ bgcolor: "#3f3f41", overflowX: "auto" }}>
          <TableContainer>
            <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
              <TableHead>
                <TableRow>
                  {["Place", "City", "User", "Status", "Date", "Actions"].map((h) => (
                    <TableCell
                      key={h}
                      sx={{ color: "#C9A726", fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {moderationData.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {request.place?.name ?? "N/A"}
                    </TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {request.place?.city}, {request.place?.country}
                    </TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {request.user?.username ?? "N/A"}
                    </TableCell>
                    <TableCell>
                      {getStatusChip(request.status?.name ?? "unknown")}
                    </TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleViewDetails(request)} sx={{ color: "#C9A726" }} size="small">
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={moderationData.total}
            page={allPage}
            rowsPerPage={allRowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            onPageChange={(_e, newPage) => setAllPage(newPage)}
            onRowsPerPageChange={(e) => {
              setAllRowsPerPage(parseInt(e.target.value, 10));
              setAllPage(0);
            }}
            sx={tablePaginationSx}
          />
        </Paper>
      ) : null}

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#3f3f41",
            color: "#fffbf9",
            m: { xs: 1, sm: 2 },
            width: { xs: "calc(100% - 16px)", sm: "auto" },
          },
        }}
      >
        <DialogTitle sx={{ color: "#C9A726", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          Moderation Request Details
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Typography
                variant="h6"
                sx={{ color: "#C9A726", mb: 2, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
              >
                {selectedRequest.place?.name}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap flexWrap="wrap">
                <Stack spacing={1} sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#C9A726", fontSize: { xs: "0.875rem", sm: "1rem" } }}
                  >
                    Place Information
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
                    sx={{ color: "#C9A726", fontSize: { xs: "0.875rem", sm: "1rem" } }}
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
                <Box sx={{ mt: 3, p: 2, bgcolor: "#2a2a2a", borderRadius: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: "#C9A726", mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}
                  >
                    Available Actions
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={handleApprove}
                      disabled={approveMutation.isPending}
                      sx={{
                        bgcolor: "#4caf50",
                        "&:hover": { bgcolor: "#45a049" },
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      {approveMutation.isPending ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={handleReject}
                      disabled={rejectMutation.isPending}
                      sx={{
                        bgcolor: "#f44336",
                        "&:hover": { bgcolor: "#d32f2f" },
                        fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      }}
                    >
                      {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                    </Button>
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDetailDialogOpen(false)}
            sx={{ color: "#C9A726", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;
