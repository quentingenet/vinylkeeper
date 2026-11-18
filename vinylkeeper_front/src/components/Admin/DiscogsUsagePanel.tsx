import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Speed } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { adminApiService, type DiscogsUsageTotals } from "@services/AdminApiService";
import { gaugeColor, usageShare } from "@components/Admin/discogsUsageGauge";
import { queryKeys } from "@utils/queryKeys";
import { ADMIN_LIVE_QUERY } from "@components/Admin/adminUtils";
import { formatLocale } from "@utils/i18n";
import { colors } from "@styles/colors";
import { useTranslation } from "react-i18next";

const formatCount = (value: number) => new Intl.NumberFormat(formatLocale()).format(value);

function Gauge({ label, totals }: { label: string; totals: DiscogsUsageTotals }) {
  const { t } = useTranslation("admin");
  const share = usageShare(totals);
  return (
    <Box sx={{ flex: 1, minWidth: 220 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ color: colors.textLight }}>{label}</Typography>
        <Typography variant="body2" sx={{ color: colors.textLight }}>
          {t("discogsUsage.calls", { calls: formatCount(totals.calls), capacity: formatCount(totals.capacity) })}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.round(share * 100)}
        color={gaugeColor(share)}
        aria-label={label}
        sx={{ height: 10, borderRadius: 5 }}
      />
    </Box>
  );
}

/** Calls made to the Discogs API, against what Discogs allows: per hour, per day and per part of the app. */
export default function DiscogsUsagePanel() {
  const { t } = useTranslation("admin");
  const usage = useQuery({
    queryKey: queryKeys.moderation.discogsUsage(),
    queryFn: () => adminApiService.getDiscogsUsage(),
    ...ADMIN_LIVE_QUERY,
  });

  const data = usage.data;
  const busiest = Math.max(1, ...(data?.hours.map((h) => h.calls) ?? [0]));
  const hourFormat = new Intl.DateTimeFormat(formatLocale(), { hour: "2-digit", minute: "2-digit" });

  return (
    <Paper sx={{ bgcolor: colors.surface, color: colors.textLight, p: { xs: 1.5, sm: 2 }, mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Speed sx={{ color: "primary.main" }} />
        <Typography variant="h5" sx={{ color: "primary.main", fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          {t("discogsUsage.title")}
        </Typography>
      </Box>

      {usage.isError && <Alert severity="error">{t("discogsUsage.loadError")}</Alert>}
      {usage.isPending && (
        <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
          <CircularProgress aria-label={t("discogsUsage.loading")} />
        </Box>
      )}

      {data && (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 2 }}>
            <Gauge label={t("discogsUsage.currentHour")} totals={data.current_hour} />
            <Gauge label={t("discogsUsage.last24Hours")} totals={data.last_24_hours} />
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            <Chip
              size="small"
              color={data.last_24_hours.rate_limited > 0 ? "error" : "default"}
              label={t("discogsUsage.rateLimited", { count: data.last_24_hours.rate_limited })}
            />
            {data.lowest_remaining !== null && (
              <Chip size="small" label={t("discogsUsage.lowestRemaining", { count: data.lowest_remaining })} />
            )}
          </Box>

          {/* One bar per hour, the busiest one full height */}
          <Box
            role="img"
            aria-label={t("discogsUsage.hoursChart")}
            sx={{ display: "flex", alignItems: "flex-end", gap: "2px", height: 60, mb: 2 }}
          >
            {data.hours.map((hour) => (
              <Tooltip
                key={hour.hour}
                title={t("discogsUsage.hourBar", { hour: hourFormat.format(new Date(hour.hour)), count: hour.calls })}
              >
                <Box
                  sx={{
                    flex: 1,
                    height: `${Math.max(2, (hour.calls / busiest) * 100)}%`,
                    bgcolor: hour.rate_limited > 0 ? "error.main" : "primary.main",
                    opacity: hour.calls > 0 ? 1 : 0.25,
                    borderRadius: "2px 2px 0 0",
                  }}
                />
              </Tooltip>
            ))}
          </Box>

          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["source", "currentHour", "last24Hours", "rateLimitedColumn"].map((column) => (
                    <TableCell key={column} sx={{ color: "primary.main", fontWeight: "bold" }}>
                      {t(`discogsUsage.columns.${column}`)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.by_source.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell sx={{ color: colors.textLight }}>{t(`discogsUsage.sources.${row.source}`)}</TableCell>
                    <TableCell sx={{ color: colors.textLight }}>{formatCount(row.calls_current_hour)}</TableCell>
                    <TableCell sx={{ color: colors.textLight }}>{formatCount(row.calls_last_24_hours)}</TableCell>
                    <TableCell sx={{ color: row.rate_limited_last_24_hours > 0 ? "error.main" : colors.textLight }}>
                      {formatCount(row.rate_limited_last_24_hours)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 1 }}>
            {t("discogsUsage.delay", { count: data.delay_seconds })}
          </Typography>
        </>
      )}
    </Paper>
  );
}
