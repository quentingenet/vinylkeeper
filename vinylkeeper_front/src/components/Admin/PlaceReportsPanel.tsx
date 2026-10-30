import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Edit, Flag } from "@mui/icons-material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiService, type PlaceReport, type ReportedPlace } from "@services/AdminApiService";
import { queryKeys } from "@utils/queryKeys";
import { isApiError } from "@utils/apiError";
import { ADMIN_LIVE_QUERY, formatDate, tablePaginationSx } from "@components/Admin/adminUtils";
import AdminSpotEditDialog from "@components/Admin/AdminSpotEditDialog";
import { issueChipLabel } from "@components/Atlas/placeReportLabels";
import { colors } from "@styles/colors";

const PAGE_SIZE = 10;

type Filter = "open" | "all";
type Feedback = { severity: "success" | "error"; message: string } | null;

function errorText(error: unknown, fallback: string): string {
  return isApiError(error) ? error.message : fallback;
}

/** Members' reports of wrong information on Atlas spots: fix the spot, resolve or dismiss. */
export default function PlaceReportsPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<PlaceReport | null>(null);
  const [removing, setRemoving] = useState<ReportedPlace | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const reports = useQuery({
    queryKey: queryKeys.moderation.placeReports(filter, page),
    queryFn: () => adminApiService.getPlaceReports(filter, page + 1, PAGE_SIZE),
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
    setFeedback({ severity: "success", message });
  };
  const failed = (fallback: string) => (error: unknown) => setFeedback({ severity: "error", message: errorText(error, fallback) });

  const resolve = useMutation({
    mutationFn: (reportId: number) => adminApiService.resolvePlaceReport(reportId),
    onSuccess: () => done("Report resolved, with the other open reports of this spot."),
    onError: failed("The report could not be resolved."),
  });
  const dismiss = useMutation({
    mutationFn: (reportId: number) => adminApiService.dismissPlaceReport(reportId),
    onSuccess: () => done("Report dismissed."),
    onError: failed("The report could not be dismissed."),
  });
  const remove = useMutation({
    mutationFn: (placeId: number) => adminApiService.removePlace(placeId),
    onSuccess: () => {
      setRemoving(null);
      done("Spot removed from the map, its reports are resolved.");
    },
    onError: failed("The spot could not be removed."),
  });
  const busy = resolve.isPending || dismiss.isPending || remove.isPending;

  const onSaved = (alsoResolve: boolean) => {
    const report = editing;
    setEditing(null);
    if (alsoResolve && report) resolve.mutate(report.id);
    else done("Spot updated on the map.");
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ color: "primary.main", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          Spot reports ({reports.data?.open_count ?? 0} open)
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_event, next: Filter | null) => {
            if (next) {
              setFilter(next);
              setPage(0);
            }
          }}
          aria-label="Reports shown"
        >
          <ToggleButton value="open">Open</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {reports.isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : reports.isError ? (
        <Alert severity="error">Error loading spot reports</Alert>
      ) : reports.data && reports.data.items.length === 0 ? (
        <Typography sx={{ color: "text.secondary" }}>
          {filter === "open" ? "No open report: every spot looks right." : "No report yet."}
        </Typography>
      ) : (
        <Paper sx={{ bgcolor: colors.surface }}>
          {reports.data?.items.map((report) => (
            <Box
              key={report.id}
              sx={{ p: 2, borderBottom: `1px solid ${colors.raised}`, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Flag fontSize="small" sx={{ color: "primary.main" }} />
                <Typography sx={{ fontWeight: "bold" }}>{report.place.name}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {report.place.city}, {report.place.country}
                </Typography>
                {report.status !== "open" && (
                  <Chip size="small" label={report.status === "resolved" ? "Resolved" : "Dismissed"} />
                )}
                {!report.place.is_valid && <Chip size="small" color="error" label="Removed from the map" />}
              </Box>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {report.issues.map((issue) => (
                  <Chip key={issue} size="small" variant="outlined" color="warning" label={issueChipLabel(issue)} />
                ))}
              </Box>
              {report.comment && (
                <Typography variant="body2" sx={{ fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                  “{report.comment}”
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Reported by {report.reporter ?? "a deleted account"} on {formatDate(report.created_at)}
              </Typography>
              {report.status === "open" && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                  <Button size="small" variant="contained" startIcon={<Edit />} onClick={() => setEditing(report)}
                    disabled={busy || !report.place.is_valid}>
                    Edit spot
                  </Button>
                  <Button size="small" variant="outlined" onClick={() => resolve.mutate(report.id)} disabled={busy}>
                    Resolve
                  </Button>
                  <Button size="small" onClick={() => dismiss.mutate(report.id)} disabled={busy}>
                    Dismiss
                  </Button>
                  {report.place.is_valid && (
                    <Button size="small" color="error" onClick={() => setRemoving(report.place)} disabled={busy}>
                      Remove from the map
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          ))}
          <TablePagination
            component="div"
            count={reports.data?.total ?? 0}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_event, next) => setPage(next)}
            sx={tablePaginationSx}
          />
        </Paper>
      )}

      <AdminSpotEditDialog place={editing?.place ?? null} onClose={() => setEditing(null)} onSaved={onSaved} />

      <Dialog open={removing !== null} onClose={() => setRemoving(null)} aria-labelledby="remove-spot-title">
        <DialogTitle id="remove-spot-title">Remove {removing?.name} from the map?</DialogTitle>
        <DialogContent>
          <Typography>
            For a spot that closed for good. It disappears from the Atlas and its open reports are resolved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoving(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => removing && remove.mutate(removing.id)}
            disabled={remove.isPending}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedback !== null}
        autoHideDuration={4500}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {feedback ? (
          <Alert severity={feedback.severity} variant="filled" onClose={() => setFeedback(null)} sx={{ width: "100%" }}>
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
