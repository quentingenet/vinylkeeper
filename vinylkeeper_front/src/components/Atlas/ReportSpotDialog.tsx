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
import { PLACE_REPORT_ISSUES, REPORT_COMMENT_MAX_LENGTH } from "@components/Atlas/placeReportLabels";
import type { PlaceReportIssue } from "@services/AdminApiService";

interface ReportSpotDialogProps {
  open: boolean;
  onClose: () => void;
  placeId: number;
  placeName: string;
}

/** A member ticks what is wrong about a spot; the admins get an email and fix it. */
export default function ReportSpotDialog({ open, onClose, placeId, placeName }: ReportSpotDialogProps) {
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
      : "The report could not be sent. Please try again later."
    : null;

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="report-spot-title">
      <DialogTitle id="report-spot-title">Report wrong information</DialogTitle>
      <DialogContent>
        {report.isSuccess ? (
          <Alert severity="success">Thanks, an admin will check this spot.</Alert>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              What is wrong about {placeName}?
            </Typography>
            <FormGroup>
              {PLACE_REPORT_ISSUES.map(({ value, label }) => (
                <FormControlLabel
                  key={value}
                  control={<Checkbox checked={issues.includes(value)} onChange={() => toggle(value)} />}
                  label={label}
                />
              ))}
            </FormGroup>
            <TextField
              label="What should it be? (optional)"
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
          <Button onClick={close}>Close</Button>
        ) : (
          <>
            <Button onClick={close}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => report.mutate()}
              disabled={issues.length === 0 || report.isPending}
            >
              Send report
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
