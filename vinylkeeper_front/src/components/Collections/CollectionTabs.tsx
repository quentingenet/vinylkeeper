import { Box, Tabs, Tab } from "@mui/material";

interface CollectionTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  isUserLoggedIn: boolean | null;
}

export default function CollectionTabs({
  value,
  onChange,
  isUserLoggedIn,
}: CollectionTabsProps) {
  return (
    <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
      <Tabs
        value={value}
        onChange={onChange}
        aria-label="collection tabs"
        variant="fullWidth"
        sx={{
          "& .MuiTab-root": {
            color: "primary.main",
            "&.Mui-selected": { color: "primary.main" },
          },
          "& .MuiTabs-indicator": { backgroundColor: "primary.main" },
        }}
      >
        <Tab label="Albums" />
        <Tab label="Artists" />
        {isUserLoggedIn && <Tab label="Wishlist" />}
      </Tabs>
    </Box>
  );
}
