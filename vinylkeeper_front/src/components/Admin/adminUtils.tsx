import { Chip } from "@mui/material";
import { colors } from "@styles/colors";

export const getStatusChip = (statusName: string) => {
  switch (statusName) {
    case "pending":
      return <Chip label="Pending" color="warning" size="small" />;
    case "approved":
      return <Chip label="Approved" color="success" size="small" />;
    case "rejected":
      return <Chip label="Rejected" color="error" size="small" />;
    default:
      return <Chip label={statusName} size="small" />;
  }
};

export const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const tablePaginationSx = {
  color: colors.textLight,
  "& .MuiTablePagination-selectIcon": { color: "primary.main" },
  "& .MuiTablePagination-actions button": { color: "primary.main" },
  "& .MuiTablePagination-actions button.Mui-disabled": { color: colors.grey700 },
  "& .MuiSelect-select": { color: colors.textLight },
};

/**
 * Admin lists follow what members do without a page reload: read again when shown, when the tab
 * comes back, and every 30 s while it is visible (never in a background tab).
 */
export const ADMIN_LIVE_QUERY = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchInterval: 30_000,
} as const;
