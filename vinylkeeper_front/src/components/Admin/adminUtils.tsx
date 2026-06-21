import { Chip } from "@mui/material";

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
  color: "#fffbf9",
  "& .MuiTablePagination-selectIcon": { color: "#C9A726" },
  "& .MuiTablePagination-actions button": { color: "#C9A726" },
  "& .MuiTablePagination-actions button.Mui-disabled": { color: "#555" },
  "& .MuiSelect-select": { color: "#fffbf9" },
};
