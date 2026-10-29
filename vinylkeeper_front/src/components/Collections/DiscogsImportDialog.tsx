import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import VinylSpinner from "@components/UI/VinylSpinner";
import useDetectMobile from "@hooks/useDetectMobile";
import { useUserContext } from "@contexts/UserContext";
import { collectionApiService, type PaginatedCollectionListResponse } from "@services/CollectionApiService";
import { discogsImportApiService } from "@services/DiscogsImportApiService";
import {
  DISCOGS_USERNAME_PATTERN,
  isImportActive,
  type DiscogsImport,
  type DiscogsImportPreview,
} from "@models/IDiscogsImport";
import { queryKeys } from "@utils/queryKeys";
import { isApiError, type ApiError } from "@utils/apiError";
import {
  IMPORT_CONDITIONS,
  importProgress,
  plural,
  existingSaveWarning,
  savedCopyName,
  summaryDetails,
  summaryWarnings,
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
  /** collectionId null: a new collection is created; saveCopy: an existing one is saved first */
  onStart: (discogsUsername: string, collectionId: number | null, saveCopy: boolean) => void;
  isStarting: boolean;
  startError: ApiError | null;
}

export default function DiscogsImportDialog({
  open,
  onClose,
  latestImport,
  onStart,
  isStarting,
  startError,
}: DiscogsImportDialogProps) {
  const { isMobile } = useDetectMobile();
  const { currentUser } = useUserContext();
  const [dismissedId, setDismissedId] = useState<number | null>(() => readDismissedId(currentUser?.user_uuid));
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState<number | typeof NEW_COLLECTION>(NEW_COLLECTION);
  // Safe by default: importing into an existing collection saves a copy of it first
  const [saveCopy, setSaveCopy] = useState(true);

  const { data: collectionsData } = useQuery<PaginatedCollectionListResponse>({
    queryKey: queryKeys.collections.list(currentUser?.user_uuid, 1, COLLECTIONS_LIMIT),
    queryFn: () => collectionApiService.getCollections(1, COLLECTIONS_LIMIT),
    enabled: open && !!currentUser?.user_uuid,
    // Read again each time the dialog opens: collections deleted or created meanwhile
    staleTime: 0,
    refetchOnMount: "always",
  });
  const collections = useMemo(() => collectionsData?.items ?? [], [collectionsData]);

  const preview = useMutation<DiscogsImportPreview, ApiError, string>({
    mutationFn: (name) => discogsImportApiService.preview(name),
  });

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

  const trimmed = username.trim();
  const isUsernameValid = DISCOGS_USERNAME_PATTERN.test(trimmed);
  const previewMatches = preview.data?.discogs_username === trimmed;
  const active = isImportActive(latestImport);
  const targetCollection = collections.find((collection) => collection.id === target);
  const targetName = targetCollection?.name ?? "";
  // One save per collection: an existing one is kept, and a save is not saved again
  const targetSaveName = targetCollection?.save_collection_name ?? null;
  const targetIsSave = targetCollection?.saved_from_collection_id != null;
  const canImport = previewMatches && (preview.data?.items_total ?? 0) > 0 && !isStarting;

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (preview.data || preview.error) preview.reset();
  };

  const checkCollection = () => {
    if (isUsernameValid) preview.mutate(trimmed);
  };

  const errorMessage = (error: ApiError | null) =>
    error && isApiError(error) ? error.message : "Something went wrong. Try again.";

  return (
    <Dialog open={open} onClose={onClose} fullScreen={isMobile} fullWidth maxWidth="sm" aria-labelledby="discogs-import-title">
      <DialogTitle
        id="discogs-import-title"
        sx={{ color: "primary.main", display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        Import from Discogs
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

            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flexWrap: "wrap" }}>
              <TextField
                size="small"
                label="Discogs username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkCollection()}
                error={trimmed !== "" && !isUsernameValid}
                helperText={trimmed !== "" && !isUsernameValid ? "Letters, digits, dots, hyphens and underscores only" : " "}
                sx={{ flexGrow: 1, minWidth: 220 }}
                autoFocus
              />
              <Button
                variant="outlined"
                onClick={checkCollection}
                disabled={!isUsernameValid || preview.isPending}
                sx={{ minHeight: 40 }}
              >
                {preview.isPending ? <VinylSpinner size={20} /> : "Check"}
              </Button>
            </Box>

            {preview.error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {errorMessage(preview.error)}
              </Alert>
            )}

            {previewMatches && preview.data && (
              <>
                <Alert severity={preview.data.items_total > 0 ? "success" : "info"} sx={{ mb: 2 }}>
                  {preview.data.items_total > 0
                    ? `${plural(preview.data.items_total, "item")} found in this Discogs collection. Only the vinyl records will be imported.`
                    : "This Discogs collection is empty."}
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
                      <MenuItem value={NEW_COLLECTION}>New collection: Discogs import ({trimmed})</MenuItem>
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
                    ? onStart(trimmed, null, false)
                    // With a save already there, the API keeps it as the copy of the import
                    : onStart(trimmed, target, !targetIsSave && (saveCopy || targetSaveName !== null))
                }
              >
                {isStarting ? <VinylSpinner size={20} /> : "Import"}
              </Button>
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
  return (
    <Alert
      severity={warnings.length > 0 ? "warning" : "success"}
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
      <Box component="span" display="block" sx={{ mt: 0.5 }}>
        Remember to confirm the pressing of each record.
      </Box>
    </Alert>
  );
}
