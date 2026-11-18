import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import VinylSpinner from "@components/UI/VinylSpinner";
import DiscogsAttribution from "@components/UI/DiscogsAttribution";
import { DISCOGS_DISCLAIMER, discogsCollectionUrl } from "@utils/discogsLinks";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { getPlatform, isCapacitorPlatform } from "@utils/CapacitorUtils";
import { DiscogsAuthSession } from "@utils/DiscogsAuthSession";
import { discogsOutcomeUrl, parseIosDiscogsReturn } from "@utils/NativeLinks";
import { useFinishDiscogsConnection } from "@hooks/useFinishDiscogsConnection";
import { logger } from "@utils/logger";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUserContext } from "@contexts/UserContext";
import { collectionApiService, type PaginatedCollectionListResponse } from "@services/CollectionApiService";
import { discogsImportApiService } from "@services/DiscogsImportApiService";
import {
  isImportActive,
  type DiscogsConnection,
  type DiscogsImport,
  type DiscogsImportPreview,
} from "@models/IDiscogsImport";
import { queryKeys } from "@utils/queryKeys";
import { isApiError, type ApiError } from "@utils/apiError";
import {
  importConditions,
  connectionOutcomeMessage,
  importProgress,
  existingSaveWarning,
  savedCopyName,
  canImportWantlist,
  previewMessage,
  wantlistUnavailableReason,
  summaryDetails,
  summaryWarnings,
  wantlistSummary,
} from "@components/Collections/discogsImportLabels";
import { Trans, useTranslation } from "react-i18next";

// Value of the "Import into" choice creating a new collection
const NEW_COLLECTION = "new";

// The summary of a finished import closes by itself after this, or with its close button
export const RESULT_DURATION_MS = 15_000;

// Per browser convenience: a result closed once does not come back when the dialog opens again
const dismissedKey = (userUuid: string | undefined) => `vk_discogs_import_dismissed_${userUuid ?? ""}`;

function readDismissedId(userUuid: string | undefined): number | null {
  try {
    const value = Number(localStorage.getItem(dismissedKey(userUuid)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function saveDismissedId(userUuid: string | undefined, id: number): void {
  try {
    localStorage.setItem(dismissedKey(userUuid), String(id));
  } catch {
    // Storage blocked (private window): the result just shows again next time
  }
}

// The API serves at most 100 collections per page: more than enough to pick one
const COLLECTIONS_LIMIT = 100;

interface DiscogsImportDialogProps {
  open: boolean;
  onClose: () => void;
  latestImport: DiscogsImport | null;
  /**
   * collectionId null: a new collection is created; saveCopy: an existing one is saved first;
   * includeWantlist: the wantlist then goes into the wishlist
   */
  onStart: (collectionId: number | null, saveCopy: boolean, includeWantlist: boolean) => void;
  isStarting: boolean;
  startError: ApiError | null;
  /** How the Discogs authorization ended, when Discogs just sent the user back (?discogs=...) */
  connectionOutcome?: string | null;
}

export default function DiscogsImportDialog({
  open,
  onClose,
  latestImport,
  onStart,
  isStarting,
  startError,
  connectionOutcome = null,
}: DiscogsImportDialogProps) {
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();
  const { t } = useTranslation("discogs");
  const [dismissedId, setDismissedId] = useState<number | null>(() => readDismissedId(currentUser?.user_uuid));
  const queryClient = useQueryClient();
  const [disconnected, setDisconnected] = useState(false);
  const [target, setTarget] = useState<number | typeof NEW_COLLECTION>(NEW_COLLECTION);
  // Safe by default: importing into an existing collection saves a copy of it first
  const [saveCopy, setSaveCopy] = useState(true);
  const [includeWantlist, setIncludeWantlist] = useState(false);

  const { data: collectionsData } = useQuery<PaginatedCollectionListResponse>({
    queryKey: queryKeys.collections.list(currentUser?.user_uuid, 1, COLLECTIONS_LIMIT),
    queryFn: () => collectionApiService.getCollections(1, COLLECTIONS_LIMIT),
    enabled: open && !!currentUser?.user_uuid,
    // Read again each time the dialog opens: collections deleted or created meanwhile
    staleTime: 0,
    refetchOnMount: "always",
  });
  const collections = useMemo(() => collectionsData?.items ?? [], [collectionsData]);

  const connection = useQuery<DiscogsConnection, ApiError>({
    queryKey: queryKeys.discogsImport.connection(currentUser?.user_uuid),
    queryFn: () => discogsImportApiService.connection(),
    enabled: open && !!currentUser?.user_uuid,
    staleTime: 0,
  });
  const connectedAs = connection.data?.connected ? connection.data.discogs_username : null;

  // Read as soon as the account is connected: no username to type, nothing to check by hand
  const preview = useQuery<DiscogsImportPreview, ApiError>({
    queryKey: queryKeys.discogsImport.preview(currentUser?.user_uuid),
    queryFn: () => discogsImportApiService.preview(),
    enabled: open && !!connectedAs,
    staleTime: 0,
    retry: false,
  });

  const navigate = useNavigate();
  const finishDiscogsConnection = useFinishDiscogsConnection();
  const isIos = getPlatform() === "ios";

  /** iOS: the Discogs page in the sign-in sheet of iOS, which hands the return back to the app itself */
  const connectInIosSheet = async (authorizeUrl: string) => {
    try {
      const { url } = await DiscogsAuthSession.start({ url: authorizeUrl });
      const target = parseIosDiscogsReturn(url);
      await finishDiscogsConnection(target ?? { kind: "discogs-denied" });
    } catch (error) {
      // Sheet closed by the member: same as refusing on Discogs; anything else: a failed connection
      const cancelled = (error as { code?: string } | null)?.code === "CANCELLED";
      if (!cancelled) {
        logger.error("Discogs sign-in sheet failed:", error,
          "plugin available:", Capacitor.isPluginAvailable("DiscogsAuthSession"));
      }
      void navigate(discogsOutcomeUrl(cancelled ? "denied" : "error"));
    }
  };

  const connect = useMutation<string, ApiError>({
    mutationFn: () => discogsImportApiService.connect(isIos ? "ios" : undefined),
    // Discogs asks the user to authorize VinylKeeper, then sends them back to the collections
    onSuccess: (authorizeUrl) => {
      if (isIos) void connectInIosSheet(authorizeUrl);
      // In the Android app, a Custom Tab over it: the WebView would be left for Discogs and could not come back.
      // Discogs then sends the user to the App Link of the site, which reopens the app.
      else if (isCapacitorPlatform()) void Browser.open({ url: authorizeUrl });
      else window.location.assign(authorizeUrl);
    },
  });

  const disconnect = useMutation<void, ApiError>({
    mutationFn: () => discogsImportApiService.disconnect(),
    onSuccess: () => {
      setDisconnected(true);
      queryClient.removeQueries({ queryKey: queryKeys.discogsImport.preview(currentUser?.user_uuid) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.discogsImport.connection(currentUser?.user_uuid) });
    },
  });
  const outcome = connectionOutcomeMessage(connectionOutcome);

  const finishedImport =
    latestImport && (latestImport.status === "done" || latestImport.status === "failed") && latestImport.id !== dismissedId
      ? latestImport
      : null;
  const finishedImportId = finishedImport?.id;

  const dismissResult = useCallback(() => {
    if (finishedImportId === undefined) return;
    setDismissedId(finishedImportId);
    saveDismissedId(currentUser?.user_uuid, finishedImportId);
  }, [finishedImportId, currentUser?.user_uuid]);

  useEffect(() => {
    if (!open || finishedImportId === undefined) return;
    const timer = window.setTimeout(dismissResult, RESULT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open, finishedImportId, dismissResult]);

  const active = isImportActive(latestImport);
  const targetCollection = collections.find((collection) => collection.id === target);
  const targetName = targetCollection?.name ?? "";
  // One save per collection: an existing one is kept, and a save is not saved again
  const targetSaveName = targetCollection?.save_collection_name ?? null;
  const targetIsSave = targetCollection?.saved_from_collection_id != null;
  // Ticked and still importable (a new preview may find it private or empty)
  const wantlistIncluded = includeWantlist && !!preview.data && canImportWantlist(preview.data);
  const canImport = !!connectedAs && (preview.data?.items_total ?? 0) > 0 && !isStarting;

  const errorMessage = (error: ApiError | null) =>
    error && isApiError(error) ? error.message : t("dialog.genericError");

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} fullWidth maxWidth="sm" aria-labelledby="discogs-import-title">
      <DialogTitle
        id="discogs-import-title"
        sx={{ color: "primary.main", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {connectedAs ? t("dialog.importTitle") : t("dialog.connectTitle")}
        <IconButton aria-label={t("common:actions.close")} onClick={onClose} sx={{ color: "text.primary" }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 1.5, sm: 3 } }}>
        {active && latestImport ? (
          <ImportInProgress job={latestImport} />
        ) : (
          <>
            {finishedImport?.status === "done" && (
              <ImportSummary job={finishedImport} onOpenCollection={onClose} onDismiss={dismissResult} />
            )}
            {finishedImport?.status === "failed" && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={dismissResult}>
                {finishedImport.error_message ?? t("dialog.lastFailed")}
              </Alert>
            )}

            <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
              {t("dialog.before")}
            </Typography>
            <List dense disablePadding aria-label={t("dialog.conditionsLabel")} sx={{ mb: 2 }}>
              {importConditions().map((condition) => (
                <ListItem key={condition} disableGutters alignItems="flex-start" sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 30, mt: 0.25, color: "primary.main" }}>
                    <CheckCircleOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography variant="body2">{condition}</Typography>
                </ListItem>
              ))}
            </List>

            {outcome && (
              <Alert severity={outcome.severity} sx={{ mb: 2 }}>
                {outcome.text}
              </Alert>
            )}

            {connection.isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <VinylSpinner size={32} />
              </Box>
            ) : connection.isError || !connection.data?.available ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("dialog.unavailable")}
              </Alert>
            ) : !connectedAs ? (
              <Box sx={{ mb: 2 }}>
                {disconnected && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t("dialog.disconnected")}
                  </Alert>
                )}
                <Button variant="contained" onClick={() => connect.mutate()} disabled={connect.isPending}>
                  {connect.isPending ? <VinylSpinner size={20} /> : t("dialog.connect")}
                </Button>
                {connect.error && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {errorMessage(connect.error)}
                  </Alert>
                )}
              </Box>
            ) : (
              <Box
                sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 2, flexWrap: "wrap" }}
              >
                <Typography variant="body2">
                  <Trans t={t} i18nKey="dialog.connectedAs" values={{ name: connectedAs }} components={{ strong: <strong /> }} />
                </Typography>
                <Button size="small" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                  {t("dialog.disconnect")}
                </Button>
              </Box>
            )}

            {connectedAs && preview.isLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <VinylSpinner size={32} />
              </Box>
            )}
            {connectedAs && preview.error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {errorMessage(preview.error)}
              </Alert>
            )}

            {connectedAs && preview.data && (
              <>
                <Alert severity={preview.data.items_total > 0 ? "success" : "info"} sx={{ mb: 2 }}>
                  {previewMessage(preview.data, includeWantlist)}
                </Alert>
                {preview.data.items_total > 0 && (
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel id="discogs-import-collection-label">{t("dialog.importInto")}</InputLabel>
                    <Select
                      labelId="discogs-import-collection-label"
                      label={t("dialog.importInto")}
                      value={target}
                      onChange={(e) =>
                        setTarget(e.target.value === NEW_COLLECTION ? NEW_COLLECTION : Number(e.target.value))
                      }
                    >
                      <MenuItem value={NEW_COLLECTION}>
                        {/* The name the API gives the new collection: not translated */}
                        {t("dialog.newCollection", { name: `Discogs import (${connectedAs})` })}
                      </MenuItem>
                      {collections.map((collection) => (
                        <MenuItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {target === NEW_COLLECTION ? (
                      <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5 }}>
                        {t("dialog.newCollectionHelp")}
                      </Typography>
                    ) : targetIsSave ? (
                      <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5 }}>
                        {t("dialog.saveTargetHelp")}
                      </Typography>
                    ) : targetSaveName ? (
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {existingSaveWarning(targetSaveName)}
                      </Alert>
                    ) : (
                      <>
                        <FormControlLabel
                          sx={{ mt: 1 }}
                          control={<Checkbox checked={saveCopy} onChange={(e) => setSaveCopy(e.target.checked)} />}
                          label={
                            <Typography variant="body2">
                              {t("dialog.saveCopy", { name: targetName })}
                            </Typography>
                          }
                        />
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {saveCopy
                            ? t("dialog.copyNamed", { name: savedCopyName(targetName) })
                            : t("dialog.noCopy")}
                        </Typography>
                      </>
                    )}
                  </FormControl>
                )}
                {preview.data.items_total > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <FormControlLabel
                      disabled={!canImportWantlist(preview.data)}
                      control={
                        <Checkbox
                          checked={includeWantlist && canImportWantlist(preview.data)}
                          onChange={(e) => setIncludeWantlist(e.target.checked)}
                        />
                      }
                      label={
                        <Typography variant="body2">
                          {canImportWantlist(preview.data)
                            ? t("dialog.alsoWantlist", { count: preview.data.wantlist_items_total ?? 0 })
                            : t("dialog.alsoWantlistPlain")}
                        </Typography>
                      }
                    />
                    {wantlistUnavailableReason(preview.data) && (
                      <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
                        {wantlistUnavailableReason(preview.data)}
                      </Typography>
                    )}
                    {includeWantlist && canImportWantlist(preview.data) && (
                      <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
                        {t("dialog.wantlistRules")}
                      </Typography>
                    )}
                  </Box>
                )}
              </>
            )}

            {startError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage(startError)}
              </Alert>
            )}

            <Box sx={{ display: "flex", justifyContent: "flex-end", pb: 1 }}>
              <Button
                variant="contained"
                disabled={!canImport}
                onClick={() =>
                  target === NEW_COLLECTION
                    ? onStart(null, false, wantlistIncluded)
                    // With a save already there, the API keeps it as the copy of the import
                    : onStart(target, !targetIsSave && (saveCopy || targetSaveName !== null), wantlistIncluded)
                }
              >
                {isStarting ? <VinylSpinner size={20} /> : t("dialog.import")}
              </Button>
            </Box>
            <Box sx={{ pb: 1 }}>
              <DiscogsAttribution
                lead={t("dialog.collectionDataBy")}
                href={connectedAs ? discogsCollectionUrl(connectedAs) : "https://www.discogs.com"}
              />
              <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
                {DISCOGS_DISCLAIMER}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ImportInProgress({ job }: { job: DiscogsImport }) {
  const { t } = useTranslation("discogs");
  const { label, value } = importProgress(job);
  return (
    <Box sx={{ py: 2 }} role="status" aria-live="polite">
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        <Trans t={t} i18nKey="progress.importing" values={{ name: job.discogs_username }} components={{ strong: <strong /> }} />
      </Typography>
      <LinearProgress
        variant={value === null ? "indeterminate" : "determinate"}
        value={value ?? undefined}
        aria-label={t("progress.label")}
        sx={{ mb: 1.5, height: 6, borderRadius: 3 }}
      />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 2 }}>
        {t("progress.canClose")}
      </Typography>
    </Box>
  );
}

interface ImportSummaryProps {
  job: DiscogsImport;
  onOpenCollection: () => void;
  onDismiss: () => void;
}

function ImportSummary({ job, onOpenCollection, onDismiss }: ImportSummaryProps) {
  const { t } = useTranslation("discogs");
  const details = summaryDetails(job);
  const warnings = summaryWarnings(job);
  const wantlist = wantlistSummary(job);
  return (
    <Alert
      severity={warnings.length > 0 || wantlist?.isError ? "warning" : "success"}
      sx={{ mb: 2 }}
      action={
        // "Open" and the close button together: an action replaces the close button of an Alert
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {job.collection_id !== null && (
            <Button component={RouterLink} to={`/collections/${job.collection_id}`} onClick={onOpenCollection} size="small">
              {t("summary.open")}
            </Button>
          )}
          <IconButton aria-label={t("common:actions.close")} size="small" color="inherit" onClick={onDismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      {t("summary.last", {
        name: job.discogs_username,
        count: job.added,
        details: details.length > 0 ? ` (${details.join(", ")})` : "",
      })}
      {warnings.map((warning) => (
        <Box component="span" key={warning} sx={{ display: "block", mt: 0.5 }}>
          {warning}
        </Box>
      ))}
      {wantlist && (
        <Box component="span" sx={{ display: "block", mt: 0.5 }}>
          {wantlist.text}
        </Box>
      )}
      <Box component="span" sx={{ display: "block", mt: 0.5 }}>
        {t("summary.confirmPressings")}
      </Box>
    </Alert>
  );
}
