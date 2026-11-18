import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Paper,
  Snackbar,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReportBase, ReportList as ReportPage } from "@services/AdminApiService";
import { REPORTS_PAGE_SIZE, type Feedback, type ReportFilter } from "@components/Admin/reportListState";
import { formatDate, tablePaginationSx } from "@components/Admin/adminUtils";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";

/** The building blocks every list of member reports of the admin panel shares (Atlas spots, collections). */

export function ReportFeedback({ feedback, onClose }: { feedback: Feedback; onClose: () => void }) {
  return (
    <Snackbar
      open={feedback !== null}
      autoHideDuration={4500}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      {feedback ? (
        <Alert severity={feedback.severity} variant="filled" onClose={onClose} sx={{ width: "100%" }}>
          {feedback.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}

interface ReportListProps<Report extends ReportBase> {
  title: string;
  filter: ReportFilter;
  onFilter: (filter: ReportFilter) => void;
  page: number;
  onPage: (page: number) => void;
  reports: UseQueryResult<ReportPage<Report>>;
  loadError: string;
  noneOpen: string;
  none: string;
  /** What is specific to this kind of report, its actions included */
  renderReport: (report: Report) => ReactNode;
}

/** Title with the open/all filter, then the reports, a page at a time, or why there are none. */
export function ReportList<Report extends ReportBase>({
  title,
  filter,
  onFilter,
  page,
  onPage,
  reports,
  loadError,
  noneOpen,
  none,
  renderReport,
}: ReportListProps<Report>) {
  const { t } = useTranslation("admin");
  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ color: "primary.main", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          {title}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_event, next: ReportFilter | null) => {
            if (next) {
              onFilter(next);
              onPage(0);
            }
          }}
          aria-label={t("reports.shown")}
        >
          <ToggleButton value="open">{t("reports.open")}</ToggleButton>
          <ToggleButton value="all">{t("reports.all")}</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {reports.isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : reports.isError ? (
        <Alert severity="error">{loadError}</Alert>
      ) : reports.data && reports.data.items.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>{filter === "open" ? noneOpen : none}</Typography>
      ) : (
        <Paper sx={{ bgcolor: colors.surface }}>
          {reports.data?.items.map((report) => (
            <Box
              key={report.id}
              sx={{ p: 2, borderBottom: `1px solid ${colors.raised}`, display: "flex", flexDirection: "column", gap: 1 }}
            >
              {renderReport(report)}
            </Box>
          ))}
          <TablePagination
            component="div"
            count={reports.data?.total ?? 0}
            page={page}
            rowsPerPage={REPORTS_PAGE_SIZE}
            rowsPerPageOptions={[REPORTS_PAGE_SIZE]}
            onPageChange={(_event, next) => onPage(next)}
            sx={tablePaginationSx}
          />
        </Paper>
      )}
    </>
  );
}

/** "Resolved" or "Dismissed" once an admin closed the report, nothing while it is open */
export function ReportStatusChip({ status }: { status: ReportBase["status"] }) {
  const { t } = useTranslation("admin");
  if (status === "open") return null;
  return <Chip size="small" label={status === "resolved" ? t("reports.statusResolved") : t("reports.statusDismissed")} />;
}

/** The comment of the member, then who reported and when */
export function ReportDetails({ report }: { report: ReportBase }) {
  const { t } = useTranslation("admin");
  return (
    <>
      {report.comment && (
        <Typography variant="body2" sx={{ fontStyle: "italic", whiteSpace: "pre-wrap" }}>
          “{report.comment}”
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {t("reports.by", { name: report.reporter ?? t("reports.deletedAccount"), date: formatDate(report.created_at) })}
      </Typography>
    </>
  );
}
