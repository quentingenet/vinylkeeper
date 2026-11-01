import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApiService, ModerationRequest, type ReportedPlace } from "@services/AdminApiService";
import { editablePlace } from "@components/Admin/adminUtils";
import { queryKeys } from "@utils/queryKeys";

interface FeedbackState {
  open: boolean;
  severity: "success" | "error";
  message: string;
}

const FEEDBACK_CLOSED: FeedbackState = { open: false, severity: "success", message: "" };

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "An unexpected error occurred. Please try again.";
};

export function useModerationActions() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<ModerationRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [moderationActionError, setModerationActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(FEEDBACK_CLOSED);
  const [editingPlace, setEditingPlace] = useState<ReportedPlace | null>(null);
  const [removingPlace, setRemovingPlace] = useState<NonNullable<ModerationRequest["place"]> | null>(null);

  const invalidateModerationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.pending() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.stats() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all(), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.map(), refetchType: "all" }),
      // The spots of a city (popup of a marker): an approved spot shows there at once too
      queryClient.invalidateQueries({ queryKey: queryKeys.places.allByLocation(), refetchType: "all" }),
    ]);
  };

  const closeDialog = () => {
    setDetailDialogOpen(false);
    setSelectedRequest(null);
    setModerationActionError(null);
  };

  const approveMutation = useMutation({
    mutationFn: (requestId: number) => adminApiService.approveModerationRequest(requestId),
    onSuccess: async () => {
      await invalidateModerationQueries();
      setModerationActionError(null);
      setFeedback({ open: true, severity: "success", message: "Moderation request approved." });
      closeDialog();
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      setModerationActionError(message);
      setFeedback({ open: true, severity: "error", message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: number) => adminApiService.rejectModerationRequest(requestId),
    onSuccess: async () => {
      await invalidateModerationQueries();
      setModerationActionError(null);
      setFeedback({ open: true, severity: "success", message: "Moderation request rejected." });
      closeDialog();
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
    if (selectedRequest) approveMutation.mutate(selectedRequest.id);
  };

  const handleReject = () => {
    if (selectedRequest) rejectMutation.mutate(selectedRequest.id);
  };

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  const handleEdit = (request: ModerationRequest) => setEditingPlace(editablePlace(request));
  const closeEdit = () => setEditingPlace(null);
  const removeMutation = useMutation({
    mutationFn: (placeId: number) => adminApiService.removePlace(placeId),
    onSuccess: async () => {
      setRemovingPlace(null);
      await Promise.all([
        invalidateModerationQueries(),
        // Its open reports are resolved too
        queryClient.invalidateQueries({ queryKey: queryKeys.moderation.allPlaceReports() }),
      ]);
      setFeedback({ open: true, severity: "success", message: "Spot removed from the map." });
    },
    onError: (error: unknown) => setFeedback({ open: true, severity: "error", message: getErrorMessage(error) }),
  });

  const handleRemove = (request: ModerationRequest) => setRemovingPlace(request.place ?? null);
  const cancelRemove = () => setRemovingPlace(null);
  const confirmRemove = (placeId: number) => removeMutation.mutate(placeId);

  const handleSpotSaved = async () => {
    setEditingPlace(null);
    await invalidateModerationQueries();
    setFeedback({ open: true, severity: "success", message: "Spot updated on the map." });
  };

  return {
    selectedRequest,
    detailDialogOpen,
    moderationActionError,
    feedback,
    closeFeedback,
    closeDialog,
    handleViewDetails,
    handleApprove,
    handleReject,
    editingPlace,
    handleEdit,
    closeEdit,
    handleSpotSaved,
    removingPlace,
    handleRemove,
    cancelRemove,
    confirmRemove,
    isRemoving: removeMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
