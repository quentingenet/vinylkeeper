import { useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { isApiError } from "@utils/apiError";
import { useTranslation } from "react-i18next";

export const REPORT_COMMENT_MAX_LENGTH = 500;

interface ReportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called once the dialog has faded out: the choices of the report go back to nothing */
  onReset?: () => void;
  /** Id of the title, for the dialog's aria-labelledby */
  titleId: string;
  title: string;
  /** What the member is asked, above the choices */
  question: string;
  /** The choices of this kind of report (checkboxes, radio buttons) */
  children: ReactNode;
  commentLabel: string;
  sendLabel: string;
  thanks: string;
  failed: string;
  /** False while nothing is chosen: the report cannot be sent */
  canSend: boolean;
  send: (comment: string) => Promise<unknown>;
}

/**
 * What every report shares: the question, the choices given by the caller, an optional comment, then
 * a confirmation once sent, or the reason it was refused. Sending is the member's confirmation.
 */
export default function ReportDialog({
  open,
  onClose,
  onReset,
  titleId,
  title,
  question,
  children,
  commentLabel,
  sendLabel,
  thanks,
  failed,
  canSend,
  send,
}: ReportDialogProps) {
  const { t } = useTranslation();
  const [comment, setComment] = useState("");
  const report = useMutation({ mutationFn: () => send(comment) });

  const close = () => {
    onClose();
    // Reset once the dialog has faded out
    setTimeout(() => {
      setComment("");
      report.reset();
      onReset?.();
    }, 200);
  };

  const errorMessage = report.isError ? (isApiError(report.error) ? report.error.message : failed) : null;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent>
        {report.isSuccess ? (
          <Alert severity="success">{thanks}</Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              {question}
            </Typography>
            {children}
            <TextField
              label={commentLabel}
              value={comment}
              onChange={(event) => setComment(event.target.value.slice(0, REPORT_COMMENT_MAX_LENGTH))}
              multiline
              minRows={2}
              fullWidth
              helperText={`${comment.length}/${REPORT_COMMENT_MAX_LENGTH}`}
              sx={{ mt: 2 }}
            />
            {errorMessage && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {errorMessage}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {report.isSuccess ? (
          <Button onClick={close}>{t("common:actions.close")}</Button>
        ) : (
          <>
            <Button onClick={close}>{t("common:actions.cancel")}</Button>
            <Button variant="contained" onClick={() => report.mutate()} disabled={!canSend || report.isPending}>
              {sendLabel}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
