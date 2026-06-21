import { Box, Card, CardContent, Typography, CircularProgress } from "@mui/material";

interface ModerationStats {
  total?: number;
  pending?: number;
  approved?: number;
  rejected?: number;
}

interface Props {
  stats: ModerationStats | undefined;
  isLoading: boolean;
}

const STAT_CARDS = [
  { key: "total" as const, label: "Total", color: "#C9A726" },
  { key: "pending" as const, label: "Pending", color: "#ff9800" },
  { key: "approved" as const, label: "Approved", color: "#4caf50" },
  { key: "rejected" as const, label: "Rejected", color: "#f44336" },
];

export default function ModerationStatsCards({ stats, isLoading }: Props) {
  return (
    <Box justifyContent="center">
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
          gap: { xs: 1, sm: 2 },
          justifyContent: "center",
          justifyItems: "center",
          mb: 4,
          mx: "auto",
          maxWidth: "800px",
        }}
      >
        {STAT_CARDS.map(({ key, label, color }) => (
          <Card
            key={label}
            sx={{
              bgcolor: "#3f3f41",
              color: "#fffbf9",
              width: { xs: "40%", sm: "100%" },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <CardContent sx={{ textAlign: "center", width: "100%", p: { xs: 1, sm: 2 } }}>
              <Typography
                variant="h6"
                sx={{ color, fontSize: { xs: "0.875rem", sm: "1.25rem" } }}
              >
                {label}
              </Typography>
              <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}>
                {isLoading ? <CircularProgress size={24} /> : (stats?.[key] ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
