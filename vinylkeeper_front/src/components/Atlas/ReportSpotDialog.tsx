import { useState } from "react";
import { Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { atlasApiService } from "@services/AtlasApiService";
import { PLACE_REPORT_ISSUES, issueLabel } from "@components/Atlas/placeReportLabels";
import ReportDialog from "@components/Reports/ReportDialog";
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

  const toggle = (issue: PlaceReportIssue) =>
    setIssues((current) => (current.includes(issue) ? current.filter((i) => i !== issue) : [...current, issue]));

  return (
    <ReportDialog
      open={open}
      onClose={onClose}
      onReset={() => setIssues([])}
      titleId="report-spot-title"
      title={t("report.title")}
      question={t("report.what", { name: placeName })}
      commentLabel={t("report.should")}
      sendLabel={t("report.send")}
      thanks={t("report.thanks")}
      failed={t("report.failed")}
      canSend={issues.length > 0}
      send={(comment) => atlasApiService.reportPlace(placeId, issues, comment)}
    >
      <FormGroup>
        {PLACE_REPORT_ISSUES.map((value) => (
          <FormControlLabel
            key={value}
            control={<Checkbox checked={issues.includes(value)} onChange={() => toggle(value)} />}
            label={issueLabel(value)}
          />
        ))}
      </FormGroup>
    </ReportDialog>
  );
}
