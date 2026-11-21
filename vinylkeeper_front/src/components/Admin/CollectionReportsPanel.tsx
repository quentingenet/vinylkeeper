import { useState } from "react";
import { Box, Button, Chip, Link, Typography } from "@mui/material";
import { OutlinedFlag } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiService } from "@services/AdminApiService";
import { queryKeys } from "@utils/queryKeys";
import { collectionUrl } from "@utils/GlobalUrls";
import { ADMIN_LIVE_QUERY } from "@components/Admin/adminUtils";
import { ReportDetails, ReportFeedback, ReportList, ReportStatusChip } from "@components/Admin/AdminReportList";
import { REPORTS_PAGE_SIZE, useReportFeedback, type ReportFilter } from "@components/Admin/reportListState";
import { useTranslation } from "react-i18next";

/** Members' reports of abuse in public collections: check the collection, then resolve or dismiss. */
export default function CollectionReportsPanel() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReportFilter>("open");
  const [page, setPage] = useState(0);
  const { feedback, clear, succeeded, failed } = useReportFeedback();

  const reports = useQuery({
    queryKey: queryKeys.moderation.collectionReports(filter, page),
    queryFn: () => adminApiService.getCollectionReports(filter, page + 1, REPORTS_PAGE_SIZE),
    ...ADMIN_LIVE_QUERY,
  });

  const done = (message: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.moderation.allCollectionReports() });
    succeeded(message);
  };
  const makePrivate = useMutation({
    mutationFn: (reportId: number) => adminApiService.makeReportedCollectionPrivate(reportId),
    onSuccess: () => {
      // The collection leaves the community lists too
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections.public.all() });
      done(t("collectionReports.madePrivate"));
    },
    onError: failed(t("collectionReports.makePrivateFailed")),
  });
  const resolve = useMutation({
    mutationFn: (reportId: number) => adminApiService.resolveCollectionReport(reportId),
    onSuccess: () => done(t("collectionReports.resolved")),
    onError: failed(t("reports.resolveFailed")),
  });
  const dismiss = useMutation({
    mutationFn: (reportId: number) => adminApiService.dismissCollectionReport(reportId),
    onSuccess: () => done(t("reports.dismissed")),
    onError: failed(t("reports.dismissFailed")),
  });
  const busy = resolve.isPending || dismiss.isPending || makePrivate.isPending;

  return (
    <Box sx={{ mb: 4 }}>
      <ReportList
        title={t("collectionReports.title", { count: reports.data?.open_count ?? 0 })}
        filter={filter}
        onFilter={setFilter}
        page={page}
        onPage={setPage}
        reports={reports}
        loadError={t("collectionReports.loadError")}
        noneOpen={t("collectionReports.noneOpen")}
        none={t("reports.none")}
        renderReport={(report) => (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <OutlinedFlag fontSize="small" sx={{ color: "primary.main" }} />
              {report.collection.is_public ? (
                <Link component={RouterLink} to={collectionUrl(report.collection.id)} sx={{ fontWeight: "bold" }}>
                  {report.collection.name}
                </Link>
              ) : (
                <Typography sx={{ fontWeight: "bold" }}>{report.collection.name}</Typography>
              )}
              {report.collection.owner && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {t("collectionReports.owner", { name: report.collection.owner })}
                </Typography>
              )}
              <ReportStatusChip status={report.status} />
              {!report.collection.is_public && <Chip size="small" label={t("collectionReports.privateNow")} />}
            </Box>
            <Box>
              <Chip size="small" variant="outlined" color="warning" label={t(`collectionReports.reasons.${report.reason}`)} />
            </Box>
            {report.collection.description && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {report.collection.description}
              </Typography>
            )}
            <ReportDetails report={report} />
            {report.status === "open" && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                <Button size="small" variant="outlined" onClick={() => resolve.mutate(report.id)} disabled={busy}>
                  {t("reports.resolve")}
                </Button>
                <Button size="small" onClick={() => dismiss.mutate(report.id)} disabled={busy}>
                  {t("reports.dismiss")}
                </Button>
                {report.collection.is_public && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => makePrivate.mutate(report.id)}
                    disabled={busy}
                  >
                    {t("collectionReports.makePrivate")}
                  </Button>
                )}
              </Box>
            )}
          </>
        )}
      />
      <ReportFeedback feedback={feedback} onClose={clear} />
    </Box>
  );
}
