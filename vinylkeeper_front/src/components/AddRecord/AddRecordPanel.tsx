import { useState } from "react";
import { Alert, Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AlbumStateForm from "@components/AddVinyls/AlbumStateForm";
import VinylSpinner from "@components/UI/VinylSpinner";
import { useAddToCollection } from "@hooks/useAddToCollection";
import type { DiscogsData } from "@models/IRequestProxy";
import { colors } from "@styles/colors";

interface AddRecordPanelProps {
  item: DiscogsData;
  itemType: "album" | "artist";
  presetCollectionId?: number;
  onDetails: () => void;
  onDone: () => void;
}

/** Actions of an unfolded search result: any collection or the wishlist, from anywhere. */
export default function AddRecordPanel({ item, itemType, presetCollectionId, onDetails, onDone }: AddRecordPanelProps) {
  const {
    successMessage,
    messageType,
    albumStateData,
    isDatePickerOpen,
    setIsDatePickerOpen,
    collections,
    collectionsLoading,
    isAddingToWishlist,
    isAddingToCollection,
    handleAlbumStateChange,
    handleAddToWishlist,
    handleAddToCollection,
    ownedHint,
    pendingDuplicate,
    confirmDuplicate,
    cancelDuplicate,
  } = useAddToCollection(item, itemType, true, onDone);

  const [chosenCollectionId, setChosenCollectionId] = useState<number | "">("");
  const preset = collections.some((c) => c.id === presetCollectionId) ? presetCollectionId : collections[0]?.id;
  const collectionId = chosenCollectionId || preset;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 2, backgroundColor: colors.panel, borderRadius: 1 }}>
      {successMessage && <Alert severity={messageType}>{successMessage}</Alert>}

      {pendingDuplicate && (
        <Alert severity="warning">
          {pendingDuplicate.message}
          <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
            <Button size="small" variant="contained" onClick={confirmDuplicate} disabled={isAddingToCollection}>
              {pendingDuplicate.confirmLabel}
            </Button>
            <Button size="small" onClick={cancelDuplicate}>
              Cancel
            </Button>
          </Box>
        </Alert>
      )}

      {itemType === "album" && (
        <AlbumStateForm
          albumStateData={albumStateData}
          onAlbumStateChange={handleAlbumStateChange}
          isDatePickerOpen={isDatePickerOpen}
          setIsDatePickerOpen={setIsDatePickerOpen}
        />
      )}

      {collectionsLoading ? (
        <Box display="flex" justifyContent="center">
          <VinylSpinner size={24} />
        </Box>
      ) : collections.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No collections yet. Create one in Collections to add records to it.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200, flexGrow: 1 }}>
            <InputLabel id={`collection-${item.uuid}-label`}>Collection</InputLabel>
            <Select
              labelId={`collection-${item.uuid}-label`}
              label="Collection"
              value={collectionId ?? ""}
              onChange={(e) => setChosenCollectionId(Number(e.target.value))}
            >
              {collections.map((collection) => (
                <MenuItem key={collection.id} value={collection.id}>
                  {collection.name}
                  {ownedHint(collection.id) ? ` (${ownedHint(collection.id)})` : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            disabled={!collectionId || isAddingToCollection || pendingDuplicate !== null}
            onClick={() => collectionId && void handleAddToCollection(collectionId)}
          >
            Add to collection
          </Button>
        </Box>
      )}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
        <Button variant="outlined" startIcon={<FavoriteIcon />} onClick={handleAddToWishlist} disabled={isAddingToWishlist}>
          Add to wishlist
        </Button>
        <Tooltip title={itemType === "album" ? "View album details" : "View artist details"}>
          <IconButton
            aria-label={itemType === "album" ? "View album details" : "View artist details"}
            onClick={onDetails}
            sx={{ color: "text.primary" }}
          >
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
