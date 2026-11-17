import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  List,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import VinylSpinner from "@components/UI/VinylSpinner";
import PaginationWithEllipsis from "@components/UI/PaginationWithEllipsis";
import PlaybackModal, {
  type PlaybackItem,
} from "@components/Modals/PlaybackModal";
import AddRecordPanel from "@components/AddRecord/AddRecordPanel";
import ReplacePressingPanel from "@components/AddRecord/ReplacePressingPanel";
import RecordResultRow from "@components/AddRecord/RecordResultRow";
import type { AddRecordOptions } from "@contexts/AddRecordContext";
import { useMusicSearch } from "@hooks/useMusicSearch";
import useDetectMobile from "@hooks/useDetectMobile";
import DiscogsAttribution from "@components/UI/DiscogsAttribution";
import { discogsSearchUrl } from "@utils/discogsLinks";
import { App as CapacitorApp } from "@capacitor/app";
import { isCapacitorPlatform } from "@utils/CapacitorUtils";
import { scanRecordBarcode } from "@utils/BarcodeScanner";
import { logger } from "@utils/logger";
import { searchResultToPlaybackItem } from "@utils/toPlaybackItem";
import { useTranslation } from "react-i18next";

interface AddRecordDialogProps {
  options: AddRecordOptions;
  onClose: () => void;
}

export default function AddRecordDialog({
  options,
  onClose,
}: AddRecordDialogProps) {
  const { t } = useTranslation("records");
  const { presetCollectionId, replaceTarget, initialQuery = "" } = options;
  const { isMobile } = useDetectMobile();
  const { results, isSearching, isChangingPage, error, search, goToPage } =
    useMusicSearch();
  const [isArtist, setIsArtist] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [details, setDetails] = useState<PlaybackItem | null>(null);

  // In the Android app the phone's back button closes what is on top: the details, then this dialog.
  // While a listener exists, Capacitor no longer goes back in the history or leaves the app.
  const onBack = useRef<() => void>(() => undefined);
  useEffect(() => {
    onBack.current = () => (details ? setDetails(null) : onClose());
  });
  useEffect(() => {
    if (!isCapacitorPlatform()) return;
    const listener = CapacitorApp.addListener("backButton", () =>
      onBack.current(),
    );
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  // Opened with a query ("Find my pressing"): its pressings are listed right away
  useEffect(() => {
    if (initialQuery) search(initialQuery, false);
  }, [initialQuery, search]);

  const runSearch = () => {
    setExpandedId(null);
    search(query, isArtist);
  };

  const scanBarcode = async () => {
    setScanError(null);
    try {
      const code = await scanRecordBarcode();
      if (!code) return;
      setExpandedId(null);
      setQuery(code);
      search(code, false, true);
    } catch (error) {
      logger.error("Barcode scan failed:", error);
      setScanError(
        error instanceof Error ? error.message : t("dialog.scanFailed"),
      );
    }
  };

  const changePage = (page: number) => {
    setExpandedId(null);
    goToPage(page);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      aria-labelledby="add-record-title"
    >
      <DialogTitle
        id="add-record-title"
        sx={{
          color: "primary.main",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {replaceTarget ? t("dialog.findPressing") : t("dialog.addRecord")}
        <IconButton
          aria-label={t("common:actions.close")}
          onClick={onClose}
          sx={{ color: "text.primary" }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
        {replaceTarget && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {replaceTarget.title
              ? t("dialog.pickPressingFor", { title: replaceTarget.title })
              : t("dialog.pickPressing")}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            alignItems: "flex-start",
            mb: 1,
            pt: 1,
          }}
        >
          {!replaceTarget && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={isArtist ? "artist" : "album"}
              onChange={(_e, value: "album" | "artist" | null) =>
                value && setIsArtist(value === "artist")
              }
              aria-label={t("dialog.searchFor")}
            >
              <ToggleButton value="album">{t("dialog.album")}</ToggleButton>
              <ToggleButton value="artist">{t("dialog.artist")}</ToggleButton>
            </ToggleButtonGroup>
          )}
          <TextField
            size="small"
            sx={{ flexGrow: 1, minWidth: 220 }}
            label={isArtist ? t("dialog.searchByArtist") : t("dialog.searchByAlbum")}
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
                      <IconButton
                        aria-label={t("dialog.search")}
                        onClick={runSearch}
                        edge="end"
                        sx={{ color: "text.primary" }}
                      >
                        <SearchIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>
        {!replaceTarget && !isArtist && (
          <Box sx={{ mb: 1 }}>
            {isCapacitorPlatform() ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => void scanBarcode()}
                >
                  {t("dialog.scan")}
                </Button>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", display: "block", mt: 0.5 }}
                >
                  {t("dialog.scanHint")}
                </Typography>
              </>
            ) : (
              <Tooltip title={t("dialog.scanSoon")}>
                {/* A disabled button fires no pointer events: the span carries the tooltip */}
                <span style={{ display: "inline-block" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<QrCodeScannerIcon />}
                    disabled
                  >
                    {t("dialog.scan")}
                  </Button>
                </span>
              </Tooltip>
            )}
            {scanError && (
              <Typography
                variant="caption"
                sx={{ color: "error.main", display: "block", mt: 0.5 }}
              >
                {scanError}
              </Typography>
            )}
          </Box>
        )}
        {/* Discogs' terms: an attribution with a link to the Discogs page of the data shown */}
        <DiscogsAttribution
          href={
            results
              ? discogsSearchUrl(results.query, results.isArtist)
              : "https://www.discogs.com"
          }
        />

        {results && results.items.length === 0 && (
          <Typography
            sx={{ color: "text.secondary", textAlign: "center", py: 4 }}
          >
            {results.isArtist ? t("dialog.noArtist") : t("dialog.noAlbum")}
          </Typography>
        )}

        {results && results.items.length > 0 && (
          <Box
            sx={{
              opacity: isChangingPage ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <List disablePadding sx={{ mt: 1 }}>
              {results.items.map((item) => (
                <RecordResultRow
                  key={item.uuid}
                  item={item}
                  isArtist={results.isArtist}
                  expanded={expandedId === item.uuid}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === item.uuid ? null : item.uuid,
                    )
                  }
                >
                  {replaceTarget && !results.isArtist ? (
                    <ReplacePressingPanel
                      pressing={item}
                      target={replaceTarget}
                      onDetails={() => setDetails(searchResultToPlaybackItem(item, false))}
                      onReplaced={onClose}
                    />
                  ) : (
                    <AddRecordPanel
                      item={item}
                      itemType={results.isArtist ? "artist" : "album"}
                      presetCollectionId={presetCollectionId}
                      onDetails={() =>
                        setDetails(searchResultToPlaybackItem(item, results.isArtist))
                      }
                      onDone={() => setExpandedId(null)}
                    />
                  )}
                </RecordResultRow>
              ))}
            </List>
            {results.total_pages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <PaginationWithEllipsis
                  count={results.total_pages}
                  page={results.page}
                  onChange={changePage}
                />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <PlaybackModal
        isOpen={details !== null}
        onClose={() => setDetails(null)}
        item={details}
      />
    </Dialog>
  );
}
