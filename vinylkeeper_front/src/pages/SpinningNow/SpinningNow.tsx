import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Button, Link, Paper, Typography } from "@mui/material";
import { Casino as CasinoIcon, Shuffle as ShuffleIcon } from "@mui/icons-material";
import LoadingCenter from "@components/UI/LoadingCenter";
import EmptyState from "@components/UI/EmptyState";
import PlaybackModal, { type PlaybackItem } from "@components/Modals/PlaybackModal";
import FilterChipGroup from "@components/SpinningNow/FilterChipGroup";
import SpinningNowAlbumCard from "@components/SpinningNow/SpinningNowAlbumCard";
import { formatDecade, formatMoodName } from "@components/SpinningNow/spinningNowLabels";
import { useSpinningNow } from "@hooks/useSpinningNow";
import useDetectMobile from "@hooks/useDetectMobile";
import { spinningNowAlbumToPlaybackItem } from "@utils/toPlaybackItem";
import { useAddRecord } from "@contexts/AddRecordContext";
import type { SpinningNowAlbum, SpinningNowFilters } from "@models/ISpinningNow";
import { useTranslation } from "react-i18next";

const PAGE_MAX_WIDTH = 1200;

export default function SpinningNow() {
  const { t } = useTranslation("spinningNow");
  // The Dashboard stats open this page on the era, genre or mood that was clicked
  const location = useLocation();
  const initialFilters = (location.state as { filters?: Partial<SpinningNowFilters> } | null)?.filters;
  const {
    filters,
    hasFilters,
    hasAlbums,
    optionsQuery,
    resultsQuery,
    surprise,
    toggleMood,
    toggleEra,
    toggleGenre,
    toggleCollection,
    clearFilters,
  } = useSpinningNow(initialFilters);
  const { isMobile } = useDetectMobile();
  const { openAddRecord } = useAddRecord();
  const [playbackItem, setPlaybackItem] = useState<PlaybackItem | null>(null);
  const [surpriseMessage, setSurpriseMessage] = useState<string | null>(null);

  const play = (album: SpinningNowAlbum) => setPlaybackItem(spinningNowAlbumToPlaybackItem(album));

  const handleSurprise = async () => {
    setSurpriseMessage(null);
    const album = await surprise.mutateAsync().catch(() => null);
    if (album) play(album);
    else setSurpriseMessage(t("nothingMatches"));
  };

  if (optionsQuery.isLoading) return <LoadingCenter />;

  if (optionsQuery.isError || !optionsQuery.data) {
    return <EmptyState message={t("unavailable")} />;
  }

  if (!hasAlbums) {
    return (
      <EmptyState
        message={
          <>
            {t("empty.before")}{" "}
            <Link component="button" onClick={() => openAddRecord()} sx={{ verticalAlign: "baseline" }}>
              {t("empty.link")}
            </Link>{" "}
            {t("empty.after")}
          </>
        }
      />
    );
  }

  const { moods, eras, genres, collections } = optionsQuery.data;
  const results = resultsQuery.data;
  // Albums just added (or not yet found on Discogs) have no tags until enriched
  const hasFilterOptions = moods.length + eras.length + genres.length > 0;

  return (
    // border-box: the app has no CssBaseline, so padding would otherwise widen the 100% width
    <Box sx={{ width: "100%", maxWidth: PAGE_MAX_WIDTH, mx: "auto", px: { xs: 2, md: 3 }, pb: 4, boxSizing: "border-box" }}>
      <Typography variant="h6" component="p" sx={{ color: "text.primary", textAlign: "center", mb: 0.5 }}>
        {t("intro")}
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mb: 3 }}>
        {t("moreRecords")}
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: "background.paper" }}>
        {!hasFilterOptions && (
          <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
            {t("notAnalysed")}
          </Typography>
        )}
        <FilterChipGroup
          title={t("filters.mood")}
          options={moods.map((m) => ({
            value: m.name,
            label: formatMoodName(m.name),
            count: m.albums_count,
            tooltip: m.description,
          }))}
          selected={filters.moods}
          onToggle={toggleMood}
          defaultExpanded={!isMobile}
        />
        <FilterChipGroup
          title={t("filters.era")}
          options={eras.map((e) => ({ value: e.decade, label: formatDecade(e.decade), count: e.albums_count }))}
          selected={filters.eras}
          onToggle={toggleEra}
          defaultExpanded={!isMobile}
        />
        <FilterChipGroup
          title={t("filters.genre")}
          options={genres.map((g) => ({ value: g.name, label: g.name, count: g.albums_count }))}
          selected={filters.genres}
          onToggle={toggleGenre}
          defaultExpanded={!isMobile}
        />
        {/* Choosing among collections only makes sense with at least two of them */}
        {collections.length > 1 && (
          <FilterChipGroup
            title={t("filters.collection")}
            options={collections.map((c) => ({ value: c.id, label: c.name, count: c.albums_count }))}
            selected={filters.collections}
            onToggle={toggleCollection}
            defaultExpanded={!isMobile}
          />
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "center", mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<CasinoIcon />}
            onClick={() => void handleSurprise()}
            disabled={surprise.isPending}
          >
            {t("surprise")}
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShuffleIcon />}
            onClick={() => void resultsQuery.refetch()}
            disabled={resultsQuery.isFetching}
          >
            {t("shuffle")}
          </Button>
          {hasFilters && (
            <Button variant="text" onClick={clearFilters}>
              {t("clear")}
            </Button>
          )}
        </Box>
        {surpriseMessage && (
          <Typography role="status" variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 2 }}>
            {surpriseMessage}
          </Typography>
        )}
      </Paper>

      {results && (
        <Typography variant="body2" role="status" sx={{ color: "text.secondary", mb: 2 }}>
          {results.total === 0
            ? t("noMatch")
            : t("results", { shown: results.items.length, count: results.total })}
        </Typography>
      )}

      {resultsQuery.isError && <EmptyState message={t("loadFailed")} />}

      {results && results.items.length > 0 && (
        <Box
          sx={{
            display: "grid",
            // minmax(0, 1fr): long single-line titles must not widen columns past the screen
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
            opacity: resultsQuery.isPlaceholderData ? 0.6 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {results.items.map((album) => (
            <SpinningNowAlbumCard key={album.id} album={album} onPlay={play} />
          ))}
        </Box>
      )}

      <PlaybackModal isOpen={playbackItem !== null} onClose={() => setPlaybackItem(null)} item={playbackItem} />
    </Box>
  );
}
