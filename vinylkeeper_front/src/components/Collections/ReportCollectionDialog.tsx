import { useState } from "react";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";
import {
  COLLECTION_REPORT_REASONS,
  collectionApiService,
  type CollectionReportReason,
} from "@services/CollectionApiService";
import ReportDialog from "@components/Reports/ReportDialog";
import { useTranslation } from "react-i18next";

interface ReportCollectionDialogProps {
  open: boolean;
  onClose: () => void;
  collectionId: number;
  collectionName: string;
}

/** The confirmation of a report: the member says why, then confirms; the admins get an email. */
export default function ReportCollectionDialog({
  open,
  onClose,
  collectionId,
  collectionName,
}: ReportCollectionDialogProps) {
  const { t } = useTranslation("collections");
  const [reason, setReason] = useState<CollectionReportReason | null>(null);

  return (
    <ReportDialog
      open={open}
      onClose={onClose}
      onReset={() => setReason(null)}
      titleId="report-collection-title"
      title={t("report.title")}
      question={t("report.why", { name: collectionName })}
      commentLabel={t("report.comment")}
      sendLabel={t("report.send")}
      thanks={t("report.thanks")}
      failed={t("report.failed")}
      canSend={reason !== null}
      send={(comment) => collectionApiService.reportCollection(collectionId, reason as CollectionReportReason, comment)}
    >
      <RadioGroup
        aria-label={t("report.reasonLabel")}
        value={reason ?? ""}
        onChange={(event) => setReason(event.target.value as CollectionReportReason)}
      >
        {COLLECTION_REPORT_REASONS.map((value) => (
          <FormControlLabel key={value} value={value} control={<Radio />} label={t(`report.reasons.${value}`)} />
        ))}
      </RadioGroup>
    </ReportDialog>
  );
}
