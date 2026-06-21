import { Box, Typography } from "@mui/material";

interface EmptyStateProps {
  message: React.ReactNode;
  minHeight?: string | number;
}

export default function EmptyState({ message, minHeight = "200px" }: EmptyStateProps) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={minHeight}>
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {message}
      </Typography>
    </Box>
  );
}
