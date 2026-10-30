import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import VinylSpinner from "@components/UI/VinylSpinner";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import PlaybackModal, { type PlaybackItem } from "@components/Modals/PlaybackModal";
import AddRecordPanel from "@components/AddRecord/AddRecordPanel";
import ReplacePressingPanel from "@components/AddRecord/ReplacePressingPanel";
import RecordResultRow from "@components/AddRecord/RecordResultRow";
import type { AddRecordOptions } from "@contexts/AddRecordContext";
import { useMusicSearch } from "@hooks/useMusicSearch";
import useDetectMobile from "@hooks/useDetectMobile";
import DiscogsAttribution from "@components/UI/DiscogsAttribution";
import { discogsSearchUrl } from "@utils/discogsLinks";
import type { DiscogsData } from "@models/IRequestProxy";

const toPlaybackItem = (item: DiscogsData, isArtist: boolean): PlaybackItem => ({
  id: item.id,
  title: item.title || item.name || "",
  artist: isArtist ? item.title || item.name || "" : item.artist?.title || "",
  image_url: item.picture || "",
  itemType: isArtist ? "artist" : "album",
});

interface AddRecordDialogProps {
  options: AddRecordOptions;
  onClose: () => void;
}

export default function AddRecordDialog({ options, onClose }: AddRecordDialogProps) {
  const { presetCollectionId, replaceTarget, initialQuery = "" } = options;
  const { isMobile } = useDetectMobile();
  const { results, isSearching, isChangingPage, error, search, goToPage } = useMusicSearch();
  const [isArtist, setIsArtist] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<PlaybackItem | null>(null);

  // Opened with a query ("Find my pressing"): its pressings are listed right away
  useEffect(() => {
    if (initialQuery) search(initialQuery, false);
  }, [initialQuery, search]);

  const runSearch = () => {
    setExpandedId(null);
    search(query, isArtist);
  };

  const changePage = (page: number) => {
    setExpandedId(null);
    goToPage(page);
  };

  return (
    <Dialog open onClose={onClose} fullScreen={isMobile} fullWidth maxWidth="md" aria-labelledby="add-record-title">
      <DialogTitle
        id="add-record-title"
        sx={{ color: "primary.main", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {replaceTarget ? "Find your pressing" : "Add a record"}
        <IconButton aria-label="Close" onClick={onClose} sx={{ color: "text.primary" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
        {replaceTarget && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Pick the pressing on your shelf{replaceTarget.title ? ` for “${replaceTarget.title}”` : ""}.
          </Alert>
        )}

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "flex-start", mb: 1, pt: 1 }}>
          {!replaceTarget && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={isArtist ? "artist" : "album"}
              onChange={(_e, value: "album" | "artist" | null) => value && setIsArtist(value === "artist")}
              aria-label="Search for"
            >
              <ToggleButton value="album">Album</ToggleButton>
              <ToggleButton value="artist">Artist</ToggleButton>
            </ToggleButtonGroup>
          )}
          <TextField
            size="small"
            sx={{ flexGrow: 1, minWidth: 220 }}
            label={`Search by ${isArtist ? "artist" : "album"}`}
            value={query}
            autoFocus={!initialQuery}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            error={!!error}
            helperText={error}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    {isSearching ? (
                      <VinylSpinner size={20} />
                    ) : (
                      <IconButton aria-label="Search" onClick={runSearch} edge="end" sx={{ color: "text.primary" }}>
                        <SearchIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        {/* Discogs' terms: an attribution with a link to the Discogs page of the data shown */}
        <DiscogsAttribution
          href={results ? discogsSearchUrl(results.query, results.isArtist) : "https://www.discogs.com"}
        />

        {results && results.items.length === 0 && (
          <Typography color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {results.isArtist ? "No artist found" : "No album found"}
          </Typography>
        )}

        {results && results.items.length > 0 && (
          <Box sx={{ opacity: isChangingPage ? 0.6 : 1, transition: "opacity 0.2s" }}>
            <List disablePadding sx={{ mt: 1 }}>
              {results.items.map((item) => (
                <RecordResultRow
                  key={item.uuid}
                  item={item}
                  isArtist={results.isArtist}
                  expanded={expandedId === item.uuid}
                  onToggle={() => setExpandedId((current) => (current === item.uuid ? null : item.uuid))}
                >
                  {replaceTarget && !results.isArtist ? (
                    <ReplacePressingPanel
                      pressing={item}
                      target={replaceTarget}
                      onDetails={() => setDetails(toPlaybackItem(item, false))}
                      onReplaced={onClose}
                    />
                  ) : (
                    <AddRecordPanel
                      item={item}
                      itemType={results.isArtist ? "artist" : "album"}
                      presetCollectionId={presetCollectionId}
                      onDetails={() => setDetails(toPlaybackItem(item, results.isArtist))}
                      onDone={() => setExpandedId(null)}
                    />
                  )}
                </RecordResultRow>
              ))}
            </List>
            {results.total_pages > 1 && (
              <Box display="flex" justifyContent="center" mt={2}>
                <PaginationWithEllipsis count={results.total_pages} page={results.page} onChange={changePage} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <PlaybackModal isOpen={details !== null} onClose={() => setDetails(null)} item={details} />
    </Dialog>
  );
}
