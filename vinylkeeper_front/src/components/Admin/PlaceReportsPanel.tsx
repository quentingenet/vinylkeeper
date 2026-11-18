import { useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import { Edit, Flag } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiService, type PlaceReport, type ReportedPlace } from "@services/AdminApiService";
import { queryKeys } from "@utils/queryKeys";
import { ADMIN_LIVE_QUERY } from "@components/Admin/adminUtils";
import { ReportDetails, ReportFeedback, ReportList, ReportStatusChip } from "@components/Admin/AdminReportList";
import { REPORTS_PAGE_SIZE, useReportFeedback, type ReportFilter } from "@components/Admin/reportListState";
import AdminSpotEditDialog from "@components/Admin/AdminSpotEditDialog";
import RemoveSpotDialog from "@components/Admin/RemoveSpotDialog";
import { issueChipLabel } from "@components/Atlas/placeReportLabels";
import { useTranslation } from "react-i18next";

/** Members' reports of wrong information on Atlas spots: fix the spot, resolve or dismiss. */
export default function PlaceReportsPanel() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReportFilter>("open");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<PlaceReport | null>(null);
  const [removing, setRemoving] = useState<ReportedPlace | null>(null);
  const { feedback, clear, succeeded, failed } = useReportFeedback();

  const reports = useQuery({
    queryKey: queryKeys.moderation.placeReports(filter, page),
    queryFn: () => adminApiService.getPlaceReports(filter, page + 1, REPORTS_PAGE_SIZE),
    ...ADMIN_LIVE_QUERY,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.moderation.allPlaceReports() });
    // The map and the spot lists show the corrected spot
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.all() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.map() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.places.allByLocation() });
  };
  const done = (message: string) => {
    refresh();
    succeeded(message);
  };

  const resolve = useMutation({
    mutationFn: (reportId: number) => adminApiService.resolvePlaceReport(reportId),
    onSuccess: () => done(t("reports.resolved")),
    onError: failed(t("reports.resolveFailed")),
  });
  const dismiss = useMutation({
    mutationFn: (reportId: number) => adminApiService.dismissPlaceReport(reportId),
    onSuccess: () => done(t("reports.dismissed")),
    onError: failed(t("reports.dismissFailed")),
  });
  const remove = useMutation({
    mutationFn: (placeId: number) => adminApiService.removePlace(placeId),
    onSuccess: () => {
      setRemoving(null);
      done(t("reports.removed"));
    },
    onError: failed(t("reports.removeFailed")),
  });
  const busy = resolve.isPending || dismiss.isPending || remove.isPending;

  const onSaved = (alsoResolve: boolean) => {
    const report = editing;
    setEditing(null);
    if (alsoResolve && report) resolve.mutate(report.id);
    else done(t("feedback.updated"));
  };

  return (
    <Box sx={{ mb: 4 }}>
      <ReportList
        title={t("reports.title", { count: reports.data?.open_count ?? 0 })}
        filter={filter}
        onFilter={setFilter}
        page={page}
        onPage={setPage}
        reports={reports}
        loadError={t("reports.loadError")}
        noneOpen={t("reports.noneOpen")}
        none={t("reports.none")}
        renderReport={(report) => (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Flag fontSize="small" sx={{ color: "primary.main" }} />
              <Typography sx={{ fontWeight: "bold" }}>{report.place.name}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {report.place.city}, {report.place.country}
              </Typography>
              <ReportStatusChip status={report.status} />
              {!report.place.is_valid && <Chip size="small" color="error" label={t("reports.offMap")} />}
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {report.issues.map((issue) => (
                <Chip key={issue} size="small" variant="outlined" color="warning" label={issueChipLabel(issue)} />
              ))}
            </Box>
            <ReportDetails report={report} />
            {report.status === "open" && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => setEditing(report)}
                  disabled={busy || !report.place.is_valid}>
                  {t("reports.edit")}
                </Button>
                <Button size="small" variant="outlined" onClick={() => resolve.mutate(report.id)} disabled={busy}>
                  {t("reports.resolve")}
                </Button>
                <Button size="small" onClick={() => dismiss.mutate(report.id)} disabled={busy}>
                  {t("reports.dismiss")}
                </Button>
                {report.place.is_valid && (
                  <Button size="small" color="error" onClick={() => setRemoving(report.place)} disabled={busy}>
                    {t("reports.remove")}
                  </Button>
                )}
              </Box>
            )}
          </>
        )}
      />

      <AdminSpotEditDialog place={editing?.place ?? null} onClose={() => setEditing(null)} onSaved={onSaved} />

      <RemoveSpotDialog
        spot={removing}
        onCancel={() => setRemoving(null)}
        onConfirm={(spotId) => remove.mutate(spotId)}
        isPending={remove.isPending}
      />

      <ReportFeedback feedback={feedback} onClose={clear} />
    </Box>
  );
}
