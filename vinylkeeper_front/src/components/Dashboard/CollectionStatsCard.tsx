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
import { useTranslation } from "react-i18next";
import { localizedCountry } from "@utils/i18n";

type StatsTab = "eras" | "genres" | "moods" | "pressings" | "community";

const TABS: StatsTab[] = ["eras", "genres", "moods", "pressings", "community"];

interface CollectionStatsCardProps {
  community: { albums: number; artists: number; places: number };
  isMobile: boolean;
}

/**
 * The user's records by era, genre, mood and pressing, for all their collections or one of them,
 * and the community overview. Only the open tab is drawn; the breakdown is asked once, then cached.
 */
export default function CollectionStatsCard({ community, isMobile }: CollectionStatsCardProps) {
  const { t } = useTranslation("dashboard");
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
          {t("statsCard.noRecords")}{" "}
          <Link component="button" onClick={() => openAddRecord()} sx={{ verticalAlign: "baseline" }}>
            {t("statsCard.addFirst")}
          </Link>{" "}
          {t("statsCard.toSeeNumbers")}
        </Typography>
      );
    }
    switch (tab) {
      case "eras":
        return (
          <BreakdownBarChart
            ariaLabel={t("statsCard.perDecade")}
            entries={data.eras.map((era) => ({ label: formatDecade(era.decade), count: era.count }))}
            onSelect={(index) => openSpinningNow({ eras: [data.eras[index].decade] })}
          />
        );
      case "genres": {
        const entries = topWithOthers(data.genres);
        return (
          <BreakdownBarChart
            ariaLabel={t("statsCard.perGenre")}
            horizontal
            entries={entries}
            onSelect={(index) => openSpinningNow({ genres: [entries[index].label] })}
          />
        );
      }
      case "moods":
        return (
          <BreakdownBarChart
            ariaLabel={t("statsCard.perMood")}
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
        {isCommunity ? t("statsCard.communityTitle") : t("statsCard.mineTitle")}
      </Typography>

      <Tabs
        value={tab}
        onChange={(_event, value: StatsTab) => setTab(value)}
        variant={isMobile ? "scrollable" : "standard"}
        centered={!isMobile}
        allowScrollButtonsMobile
        aria-label={t("statsCard.label")}
        sx={{ mb: 2 }}
      >
        {TABS.map((value) => (
          <Tab key={value} value={value} label={t(`statsCard.tabs.${value}`)} />
        ))}
      </Tabs>

      {!isCommunity && breakdown && breakdown.collections.length > 1 && (
        <TextField
          select
          size="small"
          label={t("statsCard.collection")}
          value={collectionId ?? "all"}
          onChange={(event) => setCollectionId(event.target.value === "all" ? null : Number(event.target.value))}
          sx={{ minWidth: 220, maxWidth: "100%", mb: 2 }}
        >
          <MenuItem value="all">{t("statsCard.all")}</MenuItem>
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
              {t("statsCard.discover")}
            </Box>
          </Box>
        </>
      ) : breakdownQuery.isError ? (
        <Typography sx={{ color: "text.secondary", py: 4 }}>
          {t("statsCard.unavailable")}
        </Typography>
      ) : !breakdown ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress aria-label={t("statsCard.loading")} />
        </Box>
      ) : (
        <>
          <Box sx={{ opacity: breakdownQuery.isPlaceholderData ? 0.6 : 1, transition: "opacity 0.2s" }}>
            {renderBreakdown(breakdown)}
          </Box>
          {breakdown.albums_total > 0 && tab !== "pressings" && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
              {t("statsCard.clickBar")}
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
  const { t } = useTranslation("dashboard");
  const { originals, reissues, unknown, formats } = data.pressings;
  // The countries of Discogs, named in the language of the interface; the formats stay as Discogs writes them
  const countries = data.pressings.countries.map((entry) => ({ ...entry, label: localizedCountry(entry.label) }));
  const total = originals + reissues + unknown;
  const shares = [
    { label: t("statsCard.originals"), count: originals },
    { label: t("statsCard.reissues"), count: reissues },
    ...(unknown > 0 ? [{ label: t("statsCard.unknownYear"), count: unknown }] : []),
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
      <ChipList title={t("statsCard.pressedIn")} entries={countries} />
      <ChipList title={t("statsCard.formats")} entries={formats} />
    </Box>
  );
}
