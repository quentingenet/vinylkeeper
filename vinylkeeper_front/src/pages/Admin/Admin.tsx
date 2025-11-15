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
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Visibility,
  AdminPanelSettings,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApiService, ModerationRequest } from "@services/AdminApiService";
import { useUserContext } from "@contexts/UserContext";
import useDetectMobile from "@hooks/useDetectMobile";

const Admin: React.FC = () => {
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] =
    useState<ModerationRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Check if user has admin permissions
  const isAdmin =
    currentUser?.role?.name === "admin" && currentUser?.is_superuser === true;

  // Fetch moderation requests
  const {
    data: moderationData,
    isLoading: isLoadingRequests,
    error: requestsError,
  } = useQuery({
    queryKey: ["moderation-requests"],
    queryFn: () => adminApiService.getModerationRequests(),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch pending requests
  const { data: pendingRequests, isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-moderation-requests"],
    queryFn: () => adminApiService.getPendingModerationRequests(),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["moderation-stats"],
    queryFn: () => adminApiService.getModerationStats(),
    enabled: isAdmin,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (requestId: number) =>
      adminApiService.approveModerationRequest(requestId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["moderation-requests"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["pending-moderation-requests"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["moderation-stats"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["places"],
          refetchType: "active",
        }),
      ]);
      setDetailDialogOpen(false);
      setSelectedRequest(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (requestId: number) =>
      adminApiService.rejectModerationRequest(requestId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["moderation-requests"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["pending-moderation-requests"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["moderation-stats"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["places"],
          refetchType: "active",
        }),
      ]);
      setDetailDialogOpen(false);
      setSelectedRequest(null);
    },
  });

  const handleViewDetails = (request: ModerationRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
    }
  };

  const handleReject = () => {
    if (selectedRequest) {
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

  // If user is not admin, show access denied
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
        <Typography
          variant="body1"
          sx={{ color: "#fffbf9", textAlign: "center" }}
        >
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
      <Box
        sx={{ display: "flex", alignItems: "center", mb: 3, flexWrap: "wrap" }}
      >
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
          <Card
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
            <CardContent
              sx={{ textAlign: "center", width: "100%", p: { xs: 1, sm: 2 } }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "#C9A726",
                  fontSize: { xs: "0.875rem", sm: "1.25rem" },
                }}
              >
                Total
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
              >
                {isLoadingStats ? (
                  <CircularProgress size={24} />
                ) : (
                  stats?.total || 0
                )}
              </Typography>
            </CardContent>
          </Card>
          <Card
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
            <CardContent
              sx={{ textAlign: "center", width: "100%", p: { xs: 1, sm: 2 } }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "#ff9800",
                  fontSize: { xs: "0.875rem", sm: "1.25rem" },
                }}
              >
                Pending
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
              >
                {isLoadingStats ? (
                  <CircularProgress size={24} />
                ) : (
                  stats?.pending || 0
                )}
              </Typography>
            </CardContent>
          </Card>
          <Card
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
            <CardContent
              sx={{ textAlign: "center", width: "100%", p: { xs: 1, sm: 2 } }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "#4caf50",
                  fontSize: { xs: "0.875rem", sm: "1.25rem" },
                }}
              >
                Approved
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
              >
                {isLoadingStats ? (
                  <CircularProgress size={24} />
                ) : (
                  stats?.approved || 0
                )}
              </Typography>
            </CardContent>
          </Card>
          <Card
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
            <CardContent
              sx={{ textAlign: "center", width: "100%", p: { xs: 1, sm: 2 } }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: "#f44336",
                  fontSize: { xs: "0.875rem", sm: "1.25rem" },
                }}
              >
                Rejected
              </Typography>
              <Typography
                variant="h4"
                sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}
              >
                {isLoadingStats ? (
                  <CircularProgress size={24} />
                ) : (
                  stats?.rejected || 0
                )}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Error Alert */}
      {requestsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading moderation requests
        </Alert>
      )}

      {/* Pending Requests Section */}
      <Typography
        variant="h5"
        sx={{
          color: "#C9A726",
          mb: 2,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        Pending Requests ({pendingRequests?.length || 0})
      </Typography>

      {isLoadingPending ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : pendingRequests && pendingRequests.length > 0 ? (
        <TableContainer
          component={Paper}
          sx={{ bgcolor: "#3f3f41", mb: 4, overflowX: "auto" }}
        >
          <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Place
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  City
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  User
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {request.place?.name || "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {request.place?.city}, {request.place?.country}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {request.user?.username || "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleViewDetails(request)}
                      sx={{ color: "#C9A726" }}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info" sx={{ mb: 4 }}>
          No pending requests
        </Alert>
      )}

      {/* All Requests Section */}
      <Typography
        variant="h5"
        sx={{
          color: "#C9A726",
          mb: 2,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        All Requests
      </Typography>

      {isLoadingRequests ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : moderationData ? (
        <TableContainer
          component={Paper}
          sx={{ bgcolor: "#3f3f41", overflowX: "auto" }}
        >
          <Table sx={{ minWidth: { xs: 300, sm: 650 } }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Place
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  City
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  User
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Status
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Date
                </TableCell>
                <TableCell
                  sx={{
                    color: "#C9A726",
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {moderationData.items.map((request) => (
                <TableRow key={request.id}>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {request.place?.name || "N/A"}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {request.place?.city}, {request.place?.country}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {request.user?.username || "N/A"}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(request.status?.name || "unknown")}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: "#fffbf9",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    }}
                  >
                    {formatDate(request.created_at)}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => handleViewDetails(request)}
                      sx={{ color: "#C9A726" }}
                      size="small"
                    >
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
        <DialogTitle
          sx={{ color: "#C9A726", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
        >
          Moderation Request Details
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box>
              <Typography
                variant="h6"
                sx={{
                  color: "#C9A726",
                  mb: 2,
                  fontSize: { xs: "1.1rem", sm: "1.25rem" },
                }}
              >
                {selectedRequest.place?.name}
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                useFlexGap
                flexWrap="wrap"
              >
                <Stack
                  spacing={1}
                  sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#C9A726",
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    Place Information
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>City:</strong> {selectedRequest.place?.city},{" "}
                    {selectedRequest.place?.country}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Description:</strong>{" "}
                    {selectedRequest.place?.description || "No description"}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Current Status:</strong>{" "}
                    {getStatusChip(selectedRequest.status?.name || "unknown")}
                  </Typography>
                </Stack>

                <Stack
                  spacing={1}
                  sx={{ minWidth: { xs: "100%", sm: 200 }, flex: 1 }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#C9A726",
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
                  >
                    Request Information
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Submitted by:</strong>{" "}
                    {selectedRequest.user?.username}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    <strong>Submission Date:</strong>{" "}
                    {formatDate(selectedRequest.created_at)}
                  </Typography>
                </Stack>
              </Stack>

              {selectedRequest.status?.name === "pending" && (
                <Box sx={{ mt: 3, p: 2, bgcolor: "#2a2a2a", borderRadius: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "#C9A726",
                      mb: 2,
                      fontSize: { xs: "0.875rem", sm: "1rem" },
                    }}
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
            sx={{
              color: "#C9A726",
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Admin;
