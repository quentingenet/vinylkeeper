import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApiService, ModerationRequest } from "@services/AdminApiService";
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

  const invalidateModerationQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.pending() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.stats() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all(), refetchType: "all" }),
      queryClient.invalidateQueries({ queryKey: queryKeys.places.map(), refetchType: "all" }),
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
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
