import { useState } from "react";
import { Alert, Box, Card, CardContent, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Euro } from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApiService } from "@services/UserApiService";
import { queryKeys } from "@utils/queryKeys";
import type { Currency } from "@models/IDashboardStats";

interface CurrencySectionProps {
  currency: Currency;
}

/** Currency the collection value of the dashboard is shown in. Prices are stored in EUR. */
export default function CurrencySection({ currency }: CurrencySectionProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (next: Currency) => userApiService.setCurrency(next),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.userSettings.all() });
      // The value of the dashboard is shown in the new currency
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Euro sx={{ color: "primary.main", mr: 1 }} />
          <Typography variant="h6">Collection value</Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          Currency of the estimated value of your collections on the dashboard. Dollars are converted
          from euros at the rate of the day.
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={mutation.isPending ? mutation.variables : currency}
          onChange={(_event, next: Currency | null) => {
            if (next && next !== currency) mutation.mutate(next);
          }}
          aria-label="Currency"
          disabled={mutation.isPending}
        >
          <ToggleButton value="EUR">EUR €</ToggleButton>
          <ToggleButton value="USD">USD $</ToggleButton>
        </ToggleButtonGroup>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
