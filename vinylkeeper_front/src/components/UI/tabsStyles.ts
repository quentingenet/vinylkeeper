import type { SxProps, Theme } from "@mui/material";

export const primaryTabsSx = {
  "& .MuiTab-root": {
    color: "primary.main",
    "&.Mui-selected": { color: "primary.main" },
  },
  "& .MuiTabs-indicator": { backgroundColor: "primary.main" },
} satisfies SxProps<Theme>;
