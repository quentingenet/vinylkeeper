import { useState } from "react";
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
import type { SpinningNowAlbum } from "@models/ISpinningNow";

const PAGE_MAX_WIDTH = 1200;

export default function SpinningNow() {
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
  } = useSpinningNow();
  const { isMobile } = useDetectMobile();
  const { openAddRecord } = useAddRecord();
  const [playbackItem, setPlaybackItem] = useState<PlaybackItem | null>(null);
  const [surpriseMessage, setSurpriseMessage] = useState<string | null>(null);

  const play = (album: SpinningNowAlbum) => setPlaybackItem(spinningNowAlbumToPlaybackItem(album));

  const handleSurprise = async () => {
    setSurpriseMessage(null);
    const album = await surprise.mutateAsync().catch(() => null);
    if (album) play(album);
    else setSurpriseMessage("Nothing matches these filters yet. Try removing one.");
  };

  if (optionsQuery.isLoading) return <LoadingCenter />;

  if (optionsQuery.isError || !optionsQuery.data) {
    return <EmptyState message="Spinning now is unavailable right now. Please try again later." />;
  }

  if (!hasAlbums) {
    return (
      <EmptyState
        message={
          <>
            No records in your collections yet.{" "}
            <Link component="button" onClick={() => openAddRecord()} sx={{ verticalAlign: "baseline" }}>
              Add your first vinyls
            </Link>{" "}
            and come back to pick one to play.
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
        Pick a mood, an era or a genre and find what to put on the turntable.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 3 }}>
        The more records you add, the better your picks get.
      </Typography>

      <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, backgroundColor: "background.paper" }}>
        {!hasFilterOptions && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
            Moods, eras and genres show up once your records have been analysed.
          </Typography>
        )}
        <FilterChipGroup
          title="Mood"
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
          title="Era"
          options={eras.map((e) => ({ value: e.decade, label: formatDecade(e.decade), count: e.albums_count }))}
          selected={filters.eras}
          onToggle={toggleEra}
          defaultExpanded={!isMobile}
        />
        <FilterChipGroup
          title="Genre"
          options={genres.map((g) => ({ value: g.name, label: g.name, count: g.albums_count }))}
          selected={filters.genres}
          onToggle={toggleGenre}
          defaultExpanded={!isMobile}
        />
        {/* Choosing among collections only makes sense with at least two of them */}
        {collections.length > 1 && (
          <FilterChipGroup
            title="Collection"
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
            Surprise me
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShuffleIcon />}
            onClick={() => void resultsQuery.refetch()}
            disabled={resultsQuery.isFetching}
          >
            Shuffle
          </Button>
          {hasFilters && (
            <Button variant="text" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Box>
        {surpriseMessage && (
          <Typography role="status" variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
            {surpriseMessage}
          </Typography>
        )}
      </Paper>

      {results && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} role="status">
          {results.total === 0
            ? "No record matches these filters."
            : `${results.items.length} of ${results.total} records, picked at random.`}
        </Typography>
      )}

      {resultsQuery.isError && <EmptyState message="Could not load records. Please try again." />}

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
