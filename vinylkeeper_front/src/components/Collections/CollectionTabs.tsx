import { Box, Tabs, Tab } from "@mui/material";
import { primaryTabsSx } from "@components/UI/tabsStyles";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("collections");
  return (
    <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider" }}>
      <Tabs
        value={value}
        onChange={onChange}
        aria-label={t("tabs.label")}
        variant="fullWidth"
        sx={primaryTabsSx}
      >
        <Tab label={t("tabs.albums")} />
        <Tab label={t("tabs.artists")} />
        {isUserLoggedIn && <Tab label={t("tabs.wishlist")} />}
      </Tabs>
    </Box>
  );
}
