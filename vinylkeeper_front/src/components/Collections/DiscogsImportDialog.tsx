import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import VinylSpinner from "@components/UI/VinylSpinner";
import DiscogsAttribution from "@components/UI/DiscogsAttribution";
import { DISCOGS_DISCLAIMER, discogsCollectionUrl } from "@utils/discogsLinks";
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
  DISCOGS_INDEPENDENCE,
  IMPORT_CONDITIONS,
  connectionOutcomeMessage,
  importProgress,
  plural,
  existingSaveWarning,
  savedCopyName,
  canImportWantlist,
  previewMessage,
  wantlistUnavailableReason,
  summaryDetails,
  summaryWarnings,
  wantlistSummary,
} from "@components/Collections/discogsImportLabels";

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

  const connect = useMutation<string, ApiError>({
    mutationFn: () => discogsImportApiService.connect(),
    // Discogs asks the user to authorize VinylKeeper, then sends them back to the collections
    onSuccess: (authorizeUrl) => window.location.assign(authorizeUrl),
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
    error && isApiError(error) ? error.message : "Something went wrong. Try again.";

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} fullWidth maxWidth="sm" aria-labelledby="discogs-import-title">
      <DialogTitle
        id="discogs-import-title"
        sx={{ color: "primary.main", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        {connectedAs ? "Import from Discogs" : "Connect your Discogs account"}
        <IconButton aria-label="Close" onClick={onClose} sx={{ color: "text.primary" }}>
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
                {finishedImport.error_message ?? "The last import failed. Try again."}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Before you import
            </Typography>
            <List dense disablePadding aria-label="Conditions to import a Discogs collection" sx={{ mb: 2 }}>
              {IMPORT_CONDITIONS.map((condition) => (
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
              <Box display="flex" justifyContent="center" sx={{ py: 2 }}>
                <VinylSpinner size={32} />
              </Box>
            ) : connection.isError || !connection.data?.available ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Connecting a Discogs account is not available right now. Try again later.
              </Alert>
            ) : !connectedAs ? (
              <Box sx={{ mb: 2 }}>
                {disconnected && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Your Discogs account is disconnected: VinylKeeper no longer keeps its access. You can also remove
                    VinylKeeper from the applications of your Discogs account settings.
                  </Alert>
                )}
                <Button variant="contained" onClick={() => connect.mutate()} disabled={connect.isPending}>
                  {connect.isPending ? <VinylSpinner size={20} /> : "Connect with Discogs"}
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
                  Connected to Discogs as <strong>{connectedAs}</strong>
                </Typography>
                <Button size="small" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                  Disconnect
                </Button>
              </Box>
            )}

            {connectedAs && preview.isLoading && (
              <Box display="flex" justifyContent="center" sx={{ py: 2 }}>
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
                    <InputLabel id="discogs-import-collection-label">Import into</InputLabel>
                    <Select
                      labelId="discogs-import-collection-label"
                      label="Import into"
                      value={target}
                      onChange={(e) =>
                        setTarget(e.target.value === NEW_COLLECTION ? NEW_COLLECTION : Number(e.target.value))
                      }
                    >
                      <MenuItem value={NEW_COLLECTION}>New collection: Discogs import ({connectedAs})</MenuItem>
                      {collections.map((collection) => (
                        <MenuItem key={collection.id} value={collection.id}>
                          {collection.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {target === NEW_COLLECTION ? (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        A private collection is created: deleting it undoes the import.
                      </Typography>
                    ) : targetIsSave ? (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                        This collection is a save: the records join it, there is no undo.
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
                              Save a copy of “{targetName}” before importing
                            </Typography>
                          }
                        />
                        <Typography variant="caption" color="text.secondary">
                          {saveCopy
                            ? `The copy is named “${savedCopyName(targetName)}”: delete it once everything is fine.`
                            : "Without a copy, the records join the ones of this collection: there is no undo."}
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
                            ? `Also import my Discogs wantlist (${plural(preview.data.wantlist_items_total ?? 0, "item")}) into my wishlist`
                            : "Also import my Discogs wantlist into my wishlist"}
                        </Typography>
                      }
                    />
                    {wantlistUnavailableReason(preview.data) && (
                      <Typography variant="caption" color="text.secondary" component="p">
                        {wantlistUnavailableReason(preview.data)}
                      </Typography>
                    )}
                    {includeWantlist && canImportWantlist(preview.data) && (
                      <Typography variant="caption" color="text.secondary" component="p">
                        Only vinyl records are added; a pressing you already own is skipped, another pressing of a
                        record you own is added and pointed out.
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

            <Box display="flex" justifyContent="flex-end" sx={{ pb: 1 }}>
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
                {isStarting ? <VinylSpinner size={20} /> : "Import"}
              </Button>
            </Box>
            <Box sx={{ pb: 1 }}>
              <DiscogsAttribution
                lead="Collection data provided by"
                href={connectedAs ? discogsCollectionUrl(connectedAs) : "https://www.discogs.com"}
              />
              <Typography variant="caption" color="text.secondary" component="p">
                {DISCOGS_INDEPENDENCE}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="p">
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
  const { label, value } = importProgress(job);
  return (
    <Box sx={{ py: 2 }} role="status" aria-live="polite">
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        Importing the collection of <strong>{job.discogs_username}</strong>
      </Typography>
      <LinearProgress
        variant={value === null ? "indeterminate" : "determinate"}
        value={value ?? undefined}
        aria-label="Import progress"
        sx={{ mb: 1.5, height: 6, borderRadius: 3 }}
      />
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
        You can close this window: the import goes on.
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
  const details = summaryDetails(job);
  const warnings = summaryWarnings(job);
  const wantlist = wantlistSummary(job);
  return (
    <Alert
      severity={warnings.length > 0 || wantlist?.isError ? "warning" : "success"}
      sx={{ mb: 2 }}
      action={
        // "Open" and the close button together: an action replaces the close button of an Alert
        <Box display="flex" alignItems="center">
          {job.collection_id !== null && (
            <Button component={RouterLink} to={`/collections/${job.collection_id}`} onClick={onOpenCollection} size="small">
              Open
            </Button>
          )}
          <IconButton aria-label="Close" size="small" color="inherit" onClick={onDismiss}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      }
    >
      Last import from {job.discogs_username}: {plural(job.added, "record")} added
      {details.length > 0 ? ` (${details.join(", ")})` : ""}.
      {warnings.map((warning) => (
        <Box component="span" display="block" key={warning} sx={{ mt: 0.5 }}>
          {warning}
        </Box>
      ))}
      {wantlist && (
        <Box component="span" display="block" sx={{ mt: 0.5 }}>
          {wantlist.text}
        </Box>
      )}
      <Box component="span" display="block" sx={{ mt: 0.5 }}>
        Remember to confirm the pressing of each record.
      </Box>
    </Alert>
  );
}
