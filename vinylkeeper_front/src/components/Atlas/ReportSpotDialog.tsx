import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { atlasApiService } from "@services/AtlasApiService";
import { isApiError } from "@utils/apiError";
import { PLACE_REPORT_ISSUES, REPORT_COMMENT_MAX_LENGTH, issueLabel } from "@components/Atlas/placeReportLabels";
import type { PlaceReportIssue } from "@services/AdminApiService";
import { useTranslation } from "react-i18next";

interface ReportSpotDialogProps {
  open: boolean;
  onClose: () => void;
  placeId: number;
  placeName: string;
}

/** A member ticks what is wrong about a spot; the admins get an email and fix it. */
export default function ReportSpotDialog({ open, onClose, placeId, placeName }: ReportSpotDialogProps) {
  const { t } = useTranslation("atlas");
  const [issues, setIssues] = useState<PlaceReportIssue[]>([]);
  const [comment, setComment] = useState("");

  const report = useMutation({
    mutationFn: () => atlasApiService.reportPlace(placeId, issues, comment),
  });

  const close = () => {
    onClose();
    // Reset once the dialog has faded out
    setTimeout(() => {
      setIssues([]);
      setComment("");
      report.reset();
    }, 200);
  };

  const toggle = (issue: PlaceReportIssue) =>
    setIssues((current) => (current.includes(issue) ? current.filter((i) => i !== issue) : [...current, issue]));

  const errorMessage = report.isError
    ? isApiError(report.error)
      ? report.error.message
      : t("report.failed")
    : null;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="report-spot-title">
      <DialogTitle id="report-spot-title">{t("report.title")}</DialogTitle>
      <DialogContent>
        {report.isSuccess ? (
          <Alert severity="success">{t("report.thanks")}</Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              {t("report.what", { name: placeName })}
            </Typography>
            <FormGroup>
              {PLACE_REPORT_ISSUES.map((value) => (
                <FormControlLabel
                  key={value}
                  control={<Checkbox checked={issues.includes(value)} onChange={() => toggle(value)} />}
                  label={issueLabel(value)}
                />
              ))}
            </FormGroup>
            <TextField
              label={t("report.should")}
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
            <Button
              variant="contained"
              onClick={() => report.mutate()}
              disabled={issues.length === 0 || report.isPending}
            >
              {t("report.send")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
