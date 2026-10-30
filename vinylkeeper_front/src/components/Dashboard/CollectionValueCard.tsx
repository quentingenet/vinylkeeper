import { useEffect, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import MoneyCounter from "@components/Dashboard/MoneyCounter";
import { formatWhen, refreshButtonState } from "@components/Dashboard/collectionValueLabels";
import { dashboardApiService } from "@services/DashboardApiService";
import { queryKeys } from "@utils/queryKeys";
import { isApiError } from "@utils/apiError";
import type { Currency, ValueScope } from "@models/IDashboardStats";
import styles from "../../styles/pages/Dashboard.module.scss";

// The button stays disabled that long after a click, whatever the answer: no double request
const CLICK_COOLDOWN_MS = 10_000;
// While prices are being asked again, the estimate is read again that often
const PENDING_POLL_MS = 5_000;

/**
 * Low, average and high value of a collection (the largest by default), from Discogs suggested
 * prices of its pressings, in euros and dollars. A re-evaluation asks Discogs again in the
 * background for every collection the user owns, once a day at most: the picker only changes
 * what is shown.
 */
export default function CollectionValueCard() {
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

  const refresh = useMutation({
    mutationFn: () => dashboardApiService.refreshValue(),
    onMutate: () => {
      setError(null);
      setCoolingDown(true);
      cooldownTimer.current = setTimeout(() => setCoolingDown(false), CLICK_COOLDOWN_MS);
    },
    // Every collection is re-evaluated: each value shown is read again
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["dashboard-stats", "value"] }),
    onError: (e: unknown) => setError(isApiError(e) ? e.message : "The re-evaluation could not start. Please try again later."),
  });

  if (valueQuery.isError) {
    return (
      <Paper className={styles.card}>
        <Typography sx={{ color: "text.secondary", py: 2 }}>
          The value of your collection is unavailable right now. Please try again later.
        </Typography>
      </Paper>
    );
  }
  if (!value) {
    return (
      <Paper className={styles.card} sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress aria-label="Loading the value of your collection" />
      </Paper>
    );
  }

  const button = refreshButtonState(value);
  const amounts =
    value.amounts.find((a) => a.currency === (shownCurrency ?? value.currency)) ?? value.amounts[0];
  const shares = [
    { label: "Low", amount: amounts.low },
    { label: "Average", amount: amounts.average },
    { label: "High", amount: amounts.high },
  ];

  return (
    <Paper className={styles.card}>
      <Typography className={styles.textTitleShadow} variant="h6" gutterBottom>
        Collection value
      </Typography>

      {value.collections.length > 1 && (
        <TextField
          select
          size="small"
          label="Collection"
          value={value.collection_id ?? "all"}
          onChange={(event) => setScope(event.target.value === "all" ? "all" : Number(event.target.value))}
          sx={{ minWidth: 220, maxWidth: "100%", mb: 2 }}
        >
          <MenuItem value="all">All my collections</MenuItem>
          {value.collections.map((collection) => (
            <MenuItem key={collection.id} value={collection.id}>
              {collection.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {value.records_total === 0 ? (
        <Typography sx={{ color: "text.secondary", py: 2 }}>
          No records here yet: add some to see what your collection is worth.
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
              aria-label="Currency"
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
            Estimated on {value.records_priced} of {value.records_total} records.{" "}
            {value.estimated_at ? `Last estimate on ${formatWhen(value.estimated_at)}.` : "Not estimated yet."}
          </Typography>

          <Alert severity="info" sx={{ mt: 2, textAlign: "left" }}>
            The more exact the pressings in your collection, the closer the estimate.
            {value.pressings_to_confirm > 0 &&
              ` ${value.pressings_to_confirm} pressing${value.pressings_to_confirm > 1 ? "s are" : " is"} not confirmed yet.`}
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
        Discogs suggested prices: Very Good for low, Very Good Plus for average, Near Mint for high.
        {amounts.currency !== "EUR" && value.usd_rate && value.rate_date &&
          ` Converted from euros at the ECB rate of ${value.rate_date} (1 EUR = ${value.usd_rate} USD).`}{" "}
        Data provided by{" "}
        <Link href="https://www.discogs.com" target="_blank" rel="noopener noreferrer">
          Discogs
        </Link>
        .
      </Typography>
    </Paper>
  );
}
