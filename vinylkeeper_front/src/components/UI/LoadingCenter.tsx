import { Box } from "@mui/material";
import VinylSpinner from "@components/UI/VinylSpinner";

interface LoadingCenterProps {
  minHeight?: string | number;
  spinnerSize?: number;
}

export default function LoadingCenter({ minHeight = "200px", spinnerSize }: LoadingCenterProps) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={minHeight}>
      <VinylSpinner size={spinnerSize} />
    </Box>
  );
}
