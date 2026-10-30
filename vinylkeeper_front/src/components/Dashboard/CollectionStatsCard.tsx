import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Box,
  Chip,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import BreakdownBarChart from "@components/Dashboard/BreakdownBarChart";
import CommunityOverviewChart from "@components/Dashboard/CommunityOverviewChart";
import { percentOf, topWithOthers } from "@components/Dashboard/collectionStatsLabels";
import { formatDecade, formatMoodName } from "@components/SpinningNow/spinningNowLabels";
import { dashboardApiService } from "@services/DashboardApiService";
import { queryKeys } from "@utils/queryKeys";
import { COMMUNITY_COLLECTIONS_URL, EGlobalUrls } from "@utils/GlobalUrls";
import { useAddRecord } from "@contexts/AddRecordContext";
import { growItem } from "@utils/Animations";
import type { BreakdownEntry, CollectionBreakdown } from "@models/IDashboardStats";
import type { SpinningNowFilters } from "@models/ISpinningNow";
import styles from "../../styles/pages/Dashboard.module.scss";

type StatsTab = "eras" | "genres" | "moods" | "pressings" | "community";

const TABS: { value: StatsTab; label: string }[] = [
  { value: "eras", label: "Eras" },
  { value: "genres", label: "Genres" },
  { value: "moods", label: "Moods" },
  { value: "pressings", label: "Pressings" },
  { value: "community", label: "Community" },
];

interface CollectionStatsCardProps {
  community: { albums: number; artists: number; places: number };
  isMobile: boolean;
}

/**
 * The user's records by era, genre, mood and pressing, for all their collections or one of them,
 * and the community overview. Only the open tab is drawn; the breakdown is asked once, then cached.
 */
export default function CollectionStatsCard({ community, isMobile }: CollectionStatsCardProps) {
  const [tab, setTab] = useState<StatsTab>("eras");
  const [collectionId, setCollectionId] = useState<number | null>(null);
  const navigate = useNavigate();
  const { openAddRecord } = useAddRecord();
  const isCommunity = tab === "community";

  const breakdownQuery = useQuery({
    queryKey: queryKeys.dashboard.breakdown(collectionId),
    queryFn: () => dashboardApiService.getBreakdown(collectionId),
    enabled: !isCommunity,
    staleTime: 30 * 1000,
    // The previous collection stays on screen while the next one loads
    placeholderData: keepPreviousData,
  });
  const breakdown = breakdownQuery.data;

  const openSpinningNow = (filters: Partial<SpinningNowFilters>) =>
    void navigate(EGlobalUrls.SPINNING_NOW, {
      state: { filters: { ...filters, ...(collectionId !== null && { collections: [collectionId] }) } },
    });

  const renderBreakdown = (data: CollectionBreakdown) => {
    if (data.albums_total === 0) {
      return (
        <Typography sx={{ color: "text.secondary", py: 4 }}>
          No records here yet.{" "}
          <Link component="button" onClick={() => openAddRecord()} sx={{ verticalAlign: "baseline" }}>
            Add your first vinyls
          </Link>{" "}
          to see your collection in numbers.
        </Typography>
      );
    }
    switch (tab) {
      case "eras":
        return (
          <BreakdownBarChart
            ariaLabel="Records per decade"
            entries={data.eras.map((era) => ({ label: formatDecade(era.decade), count: era.count }))}
            onSelect={(index) => openSpinningNow({ eras: [data.eras[index].decade] })}
          />
        );
      case "genres": {
        const entries = topWithOthers(data.genres);
        return (
          <BreakdownBarChart
            ariaLabel="Records per genre"
            horizontal
            entries={entries}
            onSelect={(index) => openSpinningNow({ genres: [entries[index].label] })}
          />
        );
      }
      case "moods":
        return (
          <BreakdownBarChart
            ariaLabel="Records per mood"
            horizontal
            entries={data.moods.map((mood) => ({ label: formatMoodName(mood.label), count: mood.count }))}
            onSelect={(index) => openSpinningNow({ moods: [data.moods[index].label] })}
          />
        );
      default:
        return <PressingsPanel data={data} />;
    }
  };

  return (
    <Paper className={styles.card}>
      <Typography className={styles.textTitleShadow} variant="h6" gutterBottom>
        {isCommunity ? "Community activity overview" : "Your collection in numbers"}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_event, value: StatsTab) => setTab(value)}
        variant={isMobile ? "scrollable" : "standard"}
        centered={!isMobile}
        allowScrollButtonsMobile
        aria-label="Collection stats"
        sx={{ mb: 2 }}
      >
        {TABS.map(({ value, label }) => (
          <Tab key={value} value={value} label={label} />
        ))}
      </Tabs>

      {!isCommunity && breakdown && breakdown.collections.length > 1 && (
        <TextField
          select
          size="small"
          label="Collection"
          value={collectionId ?? "all"}
          onChange={(event) => setCollectionId(event.target.value === "all" ? null : Number(event.target.value))}
          sx={{ minWidth: 220, maxWidth: "100%", mb: 2 }}
        >
          <MenuItem value="all">All my collections</MenuItem>
          {breakdown.collections.map((collection) => (
            <MenuItem key={collection.id} value={collection.id}>
              {collection.name}
            </MenuItem>
          ))}
        </TextField>
      )}

      {isCommunity ? (
        <>
          <CommunityOverviewChart {...community} isMobile={isMobile} />
          <Box sx={{ textAlign: "center", my: 2 }}>
            <Box
              component={RouterLink}
              to={COMMUNITY_COLLECTIONS_URL}
              sx={{
                color: "primary.main",
                textDecoration: "none",
                fontSize: "1.25rem",
                fontWeight: 500,
                fontFamily:
                  "Roboto,Oswald,  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
                display: "inline-block",
                animation: `${growItem} 1.7s ease-in-out infinite`,
              }}
            >
              Discover community collections
            </Box>
          </Box>
        </>
      ) : breakdownQuery.isError ? (
        <Typography sx={{ color: "text.secondary", py: 4 }}>
          Your stats are unavailable right now. Please try again later.
        </Typography>
      ) : !breakdown ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress aria-label="Loading your stats" />
        </Box>
      ) : (
        <>
          <Box sx={{ opacity: breakdownQuery.isPlaceholderData ? 0.6 : 1, transition: "opacity 0.2s" }}>
            {renderBreakdown(breakdown)}
          </Box>
          {breakdown.albums_total > 0 && tab !== "pressings" && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
              Click a bar to pick a record to play in Spinning now.
            </Typography>
          )}
        </>
      )}
    </Paper>
  );
}

function ChipList({ title, entries }: { title: string; entries: BreakdownEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography variant="subtitle2" sx={{ color: "text.secondary", mb: 1 }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
        {entries.map((entry) => (
          <Chip key={entry.label} label={`${entry.label} ${entry.count}`} variant="outlined" size="small" />
        ))}
      </Box>
    </Box>
  );
}

/** Originals against reissues, then where and how the records were pressed. */
function PressingsPanel({ data }: { data: CollectionBreakdown }) {
  const { originals, reissues, unknown, countries, formats } = data.pressings;
  const total = originals + reissues + unknown;
  const shares = [
    { label: "Original pressings", count: originals },
    { label: "Reissues", count: reissues },
    ...(unknown > 0 ? [{ label: "Year unknown", count: unknown }] : []),
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: { xs: 2, sm: 4 } }}>
        {shares.map((share) => (
          <Box key={share.label} sx={{ minWidth: 110 }}>
            <Typography variant="h4" sx={{ color: "primary.main", fontWeight: "bold" }}>
              {share.count}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {share.label} ({percentOf(share.count, total)})
            </Typography>
          </Box>
        ))}
      </Box>
      <ChipList title="Pressed in" entries={countries} />
      <ChipList title="Formats" entries={formats} />
    </Box>
  );
}
