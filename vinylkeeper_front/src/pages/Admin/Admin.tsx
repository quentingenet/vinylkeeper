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
  Alert,
  CircularProgress,
  IconButton,
  Snackbar,
} from "@mui/material";
import { Visibility, AdminPanelSettings } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@utils/queryKeys";
import { adminApiService } from "@services/AdminApiService";
import { useUserContext } from "@contexts/UserContext";
import useDetectMobile from "@hooks/useDetectMobile";
import { useModerationActions } from "@hooks/useModerationActions";
import ModerationStatsCards from "@components/Admin/ModerationStatsCards";
import ModerationDetailDialog from "@components/Admin/ModerationDetailDialog";
import { getStatusChip, formatDate, tablePaginationSx } from "@components/Admin/adminUtils";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const Admin: React.FC = () => {
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();

  const [allPage, setAllPage] = useState(0);
  const [allRowsPerPage, setAllRowsPerPage] = useState(10);
  const [pendingPage, setPendingPage] = useState(0);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState(10);

  const isAdmin = currentUser?.is_admin === true;

  const {
    selectedRequest,
    detailDialogOpen,
    moderationActionError,
    feedback,
    closeFeedback,
    closeDialog,
    handleViewDetails,
    handleApprove,
    handleReject,
    isApproving,
    isRejecting,
  } = useModerationActions();

  const { data: moderationData, isLoading: isLoadingRequests, error: requestsError } = useQuery({
    queryKey: queryKeys.moderation.list(allPage + 1, allRowsPerPage),
    queryFn: () => adminApiService.getModerationRequests(allPage + 1, allRowsPerPage),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const { data: pendingData, isLoading: isLoadingPending } = useQuery({
    queryKey: queryKeys.moderation.pendingList(pendingPage + 1, pendingRowsPerPage),
    queryFn: () => adminApiService.getPendingModerationRequests(pendingPage + 1, pendingRowsPerPage),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: queryKeys.moderation.stats(),
    queryFn: () => adminApiService.getModerationStats(),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

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
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: isMobile ? "100dvw" : "1200px", margin: "0 auto" }}>
      <Snackbar
        open={feedback.open}
        autoHideDuration={4500}
        onClose={closeFeedback}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={feedback.severity} variant="filled" onClose={closeFeedback} sx={{ width: "100%" }}>
          {feedback.message}
        </Alert>
      </Snackbar>

      <Box sx={{ display: "flex", alignItems: "center", mb: 3, flexWrap: "wrap" }}>
        <AdminPanelSettings sx={{ fontSize: { xs: 24, sm: 28, md: 32 }, color: "#C9A726", mr: 2 }} />
        <Typography variant="h4" sx={{ color: "#C9A726", fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" } }}>
          Administration
        </Typography>
      </Box>

      <ModerationStatsCards stats={stats} isLoading={isLoadingStats} />

      {requestsError && (
        <Alert severity="error" sx={{ mb: 3 }}>Error loading moderation requests</Alert>
      )}
      {moderationActionError && (
        <Alert severity="error" sx={{ mb: 3 }}>{moderationActionError}</Alert>
      )}

      {/* Pending Requests */}
      <Typography variant="h5" sx={{ color: "#C9A726", mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
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
                    <TableCell key={h} sx={{ color: "#C9A726", fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingData.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{request.place?.name ?? "N/A"}</TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{request.place?.city}, {request.place?.country}</TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{request.user?.username ?? "N/A"}</TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{formatDate(request.created_at)}</TableCell>
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
            onRowsPerPageChange={(e) => { setPendingRowsPerPage(parseInt(e.target.value, 10)); setPendingPage(0); }}
            sx={tablePaginationSx}
          />
        </Paper>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>No pending requests</Alert>
      )}

      {/* All Requests */}
      <Typography variant="h5" sx={{ color: "#C9A726", mb: 2, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
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
                    <TableCell key={h} sx={{ color: "#C9A726", fontWeight: "bold", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {moderationData.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{request.place?.name ?? "N/A"}</TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{request.place?.city}, {request.place?.country}</TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{request.user?.username ?? "N/A"}</TableCell>
                    <TableCell>{getStatusChip(request.status?.name ?? "unknown")}</TableCell>
                    <TableCell sx={{ color: "#fffbf9", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>{formatDate(request.created_at)}</TableCell>
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
            onRowsPerPageChange={(e) => { setAllRowsPerPage(parseInt(e.target.value, 10)); setAllPage(0); }}
            sx={tablePaginationSx}
          />
        </Paper>
      ) : null}

      <ModerationDetailDialog
        open={detailDialogOpen}
        onClose={closeDialog}
        selectedRequest={selectedRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        isApproving={isApproving}
        isRejecting={isRejecting}
      />
    </Box>
  );
};

export default Admin;
