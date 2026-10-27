import { Box, Tabs, Tab } from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@hooks/useDocumentTitle";
import MyCollectionsPanel from "@components/Collections/MyCollectionsPanel";
import CommunityCollectionsPanel from "@components/Collections/CommunityCollectionsPanel";
import { collectionGridDesktopWidth } from "@components/Collections/collectionGridLayout";
import { primaryTabsSx } from "@components/UI/tabsStyles";
import {
  COLLECTIONS_TAB_PARAM,
  COMMUNITY_TAB_VALUE,
} from "@utils/GlobalUrls";

type CollectionsTab = "mine" | "community";

const TAB_IDS: Record<CollectionsTab, { tab: string; panel: string }> = {
  mine: { tab: "collections-tab-mine", panel: "collections-tabpanel-mine" },
  community: {
    tab: "collections-tab-community",
    panel: "collections-tabpanel-community",
  },
};

/** The active tab lives in the URL so back/forward navigation and shared links work. */
export default function CollectionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: CollectionsTab =
    searchParams.get(COLLECTIONS_TAB_PARAM) === COMMUNITY_TAB_VALUE
      ? "community"
      : "mine";

  useDocumentTitle(
    activeTab === "community" ? "Community collections - VinylKeeper" : null
  );

  const handleTabChange = (
    _event: React.SyntheticEvent,
    newTab: CollectionsTab
  ) => {
    if (newTab === activeTab) return;
    const nextParams = new URLSearchParams(searchParams);
    if (newTab === "community") {
      nextParams.set(COLLECTIONS_TAB_PARAM, COMMUNITY_TAB_VALUE);
    } else {
      nextParams.delete(COLLECTIONS_TAB_PARAM);
    }
    setSearchParams(nextParams);
  };

  return (
    <Box sx={{ width: "100%", maxWidth: collectionGridDesktopWidth, mx: "auto" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Collections tabs"
          variant="fullWidth"
          sx={[
            primaryTabsSx,
            (theme) => ({
              "& .MuiTab-root": {
                fontSize: theme.typography.h3.fontSize,
                fontWeight: theme.typography.h3.fontWeight,
              },
            }),
          ]}
        >
          <Tab
            label="My collections"
            value="mine"
            id={TAB_IDS.mine.tab}
            aria-controls={TAB_IDS.mine.panel}
          />
          <Tab
            label="Community"
            value="community"
            id={TAB_IDS.community.tab}
            aria-controls={TAB_IDS.community.panel}
          />
        </Tabs>
      </Box>

      <Box
        role="tabpanel"
        id={TAB_IDS[activeTab].panel}
        aria-labelledby={TAB_IDS[activeTab].tab}
        display="flex"
        flexDirection="column"
        alignItems="center"
      >
        {activeTab === "community" ? (
          <CommunityCollectionsPanel />
        ) : (
          <MyCollectionsPanel />
        )}
      </Box>
    </Box>
  );
}
