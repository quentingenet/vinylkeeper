import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useUserContext } from "@contexts/UserContext";
import { collectionApiService, type PaginatedCollectionListResponse } from "@services/CollectionApiService";
import { externalReferenceApiService } from "@services/ExternalReferenceService";
import type { MoveToCollectionResponse, WishlistPressing } from "@models/IExternalReference";
import EditionChips from "@components/Records/EditionChips";
import { queryKeys } from "@utils/queryKeys";
import { isApiError, type ApiError } from "@utils/apiError";

// The API serves at most 100 collections per page: more than enough to pick one
const COLLECTIONS_LIMIT = 100;

export interface WantedRecord {
  /** Wishlist row of the pressing, or of the artist */
  id: number;
  title: string;
  entityType: "album" | "artist";
  /** The pressing about to go into the collection, when its details are known */
  pressing?: WishlistPressing;
}

interface MoveToCollectionDialogProps {
  record: WantedRecord | null;
  onClose: () => void;
  onMoved: (message: string) => void;
}

/** « Got it »: a wanted record into one of the user's collections, out of the wishlist. */
export default function MoveToCollectionDialog({ record, onClose, onMoved }: MoveToCollectionDialogProps) {
  const queryClient = useQueryClient();
  const { currentUser } = useUserContext();
  const [picked, setPicked] = useState<number | "">("");
  // Not sure it is the very pressing got: it goes in to confirm, or to replace, in the collection
  const [exactPressing, setExactPressing] = useState(true);
  const isAlbum = record?.entityType !== "artist";

  const { data } = useQuery<PaginatedCollectionListResponse>({
    queryKey: queryKeys.collections.list(currentUser?.user_uuid, 1, COLLECTIONS_LIMIT),
    queryFn: () => collectionApiService.getCollections(1, COLLECTIONS_LIMIT),
    enabled: record !== null && !!currentUser?.user_uuid,
  });
  // Saves are copies kept to restore from: a record goes into a real collection
  const collections = useMemo(
    () => (data?.items ?? []).filter((collection) => collection.saved_from_collection_id == null),
    [data]
  );
  const collectionId: number | "" = picked !== "" ? picked : collections.length > 0 ? collections[0].id : "";

  const move = useMutation<
    MoveToCollectionResponse,
    ApiError,
    { wishlistId: number; collectionId: number; pressingConfirmed: boolean }
  >({
    mutationFn: ({ wishlistId, collectionId: target, pressingConfirmed }) =>
      externalReferenceApiService.moveWishlistItemToCollection(wishlistId, target, pressingConfirmed),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.albums(result.collection_id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(result.collection_id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.spinningNow.all() }),
      ]);
      onMoved(result.message);
      close();
    },
  });

  const close = () => {
    setPicked("");
    setExactPressing(true);
    move.reset();
    onClose();
  };

  return (
    <Dialog open={record !== null} onClose={close} fullWidth maxWidth="xs" aria-labelledby="move-to-collection-title">
      <DialogTitle id="move-to-collection-title" sx={{ color: "primary.main" }}>
        Got it? Move it to a collection
      </DialogTitle>
      <DialogContent>
        {isAlbum ? (
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            <strong>“{record?.title}”</strong> goes into the collection you pick and leaves your wishlist.
            Already in that collection, it gets one more copy.
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>“{record?.title}”</strong> joins the artists of the collection you pick and leaves your
            wishlist.
          </Typography>
        )}
        {isAlbum && record?.pressing && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Pressing
            </Typography>
            <EditionChips
              centered={false}
              album={{
                year: record.pressing.release_year?.toString() ?? null,
                country: record.pressing.country,
                label: record.pressing.label,
                catno: record.pressing.catno,
                formats: record.pressing.formats,
              }}
            />
          </Box>
        )}
        {isAlbum && (
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={<Checkbox checked={exactPressing} onChange={(e) => setExactPressing(e.target.checked)} />}
              label={<Typography variant="body2">This is the exact pressing I got</Typography>}
            />
            {!exactPressing && (
              <Typography variant="caption" color="text.secondary" component="p">
                The record goes in with a pressing to confirm: in the collection, confirm it or find the right
                one to replace it.
              </Typography>
            )}
          </Box>
        )}
        {collections.length > 0 ? (
          <FormControl fullWidth size="small">
            <InputLabel id="move-to-collection-label">Collection</InputLabel>
            <Select
              labelId="move-to-collection-label"
              label="Collection"
              value={collectionId}
              onChange={(e) => setPicked(Number(e.target.value))}
            >
              {collections.map((collection) => (
                <MenuItem key={collection.id} value={collection.id}>
                  {collection.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          data && <Alert severity="info">Create a collection first to move records into it.</Alert>
        )}
        {move.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {isApiError(move.error) ? move.error.message : "The record could not be moved. Try again."}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={move.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={record === null || collectionId === "" || move.isPending}
          onClick={() =>
            record &&
            collectionId !== "" &&
            move.mutate({ wishlistId: record.id, collectionId, pressingConfirmed: !isAlbum || exactPressing })
          }
        >
          {move.isPending ? "Moving..." : "Move"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
