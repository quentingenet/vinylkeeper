import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import MoneyCounter from "@components/Dashboard/MoneyCounter";
import { formatWhen, refreshAllowedAgain, refreshButtonState } from "@components/Dashboard/collectionValueLabels";
import { dashboardApiService } from "@services/DashboardApiService";
import { queryKeys } from "@utils/queryKeys";
import { isApiError } from "@utils/apiError";
import type { Currency, ValueScope } from "@models/IDashboardStats";
import styles from "../../styles/pages/Dashboard.module.scss";
import { useTranslation } from "react-i18next";
import { formatDate } from "@utils/i18n";

// The button stays disabled that long after a click, whatever the answer: no double request
const CLICK_COOLDOWN_MS = 10_000;
// While prices are being asked again, the estimate is read again that often
const PENDING_POLL_MS = 5_000;
// The countdown to the next re-evaluation shows minutes: twice a minute is enough
const COUNTDOWN_TICK_MS = 30_000;

/**
 * Low, average and high value of a collection (the largest by default), from Discogs suggested
 * prices of its pressings, in euros and dollars. A re-evaluation asks Discogs again in the
 * background for every collection the user owns, once a day at most: the picker only changes
 * what is shown.
 */
export default function CollectionValueCard() {
  const { t } = useTranslation("dashboard");
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<ValueScope>("largest");
  const [coolingDown, setCoolingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Null: the currency picked in Settings
  const [shownCurrency, setShownCurrency] = useState<Currency | null>(null);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
  }, []);

  const valueQuery = useQuery({
    queryKey: queryKeys.dashboard.value(scope),
    queryFn: () => dashboardApiService.getValue(scope),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => ((query.state.data?.refresh_pending ?? 0) > 0 ? PENDING_POLL_MS : false),
  });
  const value = valueQuery.data;

  // Countdown to the next re-evaluation: the clock only ticks while one is awaited
  const counting = !!value && value.refreshes_left === 0 && !!value.next_refresh_at;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!counting) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, COUNTDOWN_TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [counting]);
  // The wait is over: the value is read again, which gives the button back
  const allowedAgain = !!value && refreshAllowedAgain(value, now);
  useEffect(() => {
    if (allowedAgain) void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", "value"] });
  }, [allowedAgain, queryClient]);

  const refresh = useMutation({
    mutationFn: () => dashboardApiService.refreshValue(),
    onMutate: () => {
      setError(null);
      setCoolingDown(true);
      cooldownTimer.current = setTimeout(() => setCoolingDown(false), CLICK_COOLDOWN_MS);
    },
    // Every collection is re-evaluated: each value shown is read again
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", "value"] }),
    onError: (e: unknown) => setError(isApiError(e) ? e.message : t("value.startFailed")),
  });

  if (valueQuery.isError) {
    return (
      <Paper className={styles.card}>
        <Typography sx={{ color: "text.secondary", py: 2 }}>
          {t("value.unavailable")}
        </Typography>
      </Paper>
    );
  }
  if (!value) {
    return (
      <Paper className={styles.card} sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress aria-label={t("value.loading")} />
      </Paper>
    );
  }

  const button = refreshButtonState(value, now);
  const amounts =
    value.amounts.find((a) => a.currency === (shownCurrency ?? value.currency)) ?? value.amounts[0];
  const shares = [
    { label: t("value.low"), amount: amounts.low },
    { label: t("value.average"), amount: amounts.average },
    { label: t("value.high"), amount: amounts.high },
  ];

  return (
    <Paper className={styles.card}>
      <Typography className={styles.textTitleShadow} variant="h6" gutterBottom>
        {t("value.title")}
      </Typography>

      {value.collections.length > 1 && (
        <TextField
          select
          size="small"
          label={t("value.collection")}
          value={value.collection_id ?? "all"}
          onChange={(event) => setScope(event.target.value === "all" ? "all" : Number(event.target.value))}
          sx={{ minWidth: 220, maxWidth: "100%", mb: 2 }}
        >
          <MenuItem value="all">{t("value.all")}</MenuItem>
          {value.collections.map((collection) => (
            <MenuItem key={collection.id} value={collection.id}>
              {collection.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {value.records_total === 0 ? (
        <Typography sx={{ color: "text.secondary", py: 2 }}>
          {t("value.empty")}
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: { xs: 2, sm: 5 },
              opacity: valueQuery.isPlaceholderData ? 0.6 : 1,
            }}
          >
            {shares.map((share) => (
              <Box key={share.label} sx={{ minWidth: 100 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {share.label}
                </Typography>
                <Typography variant="h4" sx={{ color: "primary.main", fontWeight: "bold" }}>
                  <MoneyCounter amount={share.amount} currency={amounts.currency} />
                </Typography>
              </Box>
            ))}
          </Box>

          {value.amounts.length > 1 && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={amounts.currency}
              onChange={(_event, next: Currency | null) => next && setShownCurrency(next)}
              aria-label={t("value.currency")}
              sx={{ mt: 2 }}
            >
              {value.amounts.map((a) => (
                <ToggleButton key={a.currency} value={a.currency}>
                  {a.currency}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
            {t("value.estimatedOn", { priced: value.records_priced, count: value.records_total })}{" "}
            {value.estimated_at ? t("value.lastEstimate", { when: formatWhen(value.estimated_at) }) : t("value.notEstimated")}
          </Typography>

          <Alert severity="info" sx={{ mt: 2, textAlign: "left" }}>
            {t("value.exactness")}
            {value.pressings_to_confirm > 0 &&
              t("value.toConfirm", { count: value.pressings_to_confirm })}
          </Alert>
        </>
      )}

      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
        <Button
          variant="outlined"
          onClick={() => refresh.mutate()}
          disabled={button.disabled || coolingDown || refresh.isPending}
          startIcon={value.refresh_pending > 0 ? <CircularProgress size={16} /> : <Refresh />}
        >
          {button.label}
        </Button>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {button.hint}
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 2 }}>
        {t("value.sources")}
        {amounts.currency !== "EUR" && value.usd_rate && value.rate_date &&
          t("value.converted", { date: formatDate(value.rate_date), rate: value.usd_rate })}
      </Typography>
    </Paper>
  );
}
