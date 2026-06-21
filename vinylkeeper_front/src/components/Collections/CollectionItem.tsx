import { logger } from "@utils/logger";
import { useState, useEffect } from "react";
import {
  type CollectionResponse,
  type CollectionListItemResponse,
} from "@services/CollectionApiService";
import { useCollections } from "@hooks/useCollections";
import { useLikeButton } from "@hooks/useLikeButton";
import vinylKeeperImg from "@assets/vinylKeeper.svg";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { truncateText } from "@utils/GlobalUtils";
import { createPortal } from "react-dom";

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

interface CollectionItemProps {
  collection: CollectionResponse | CollectionListItemResponse;
  onSwitchArea: (isPublic: boolean) => void;
  handleOpenModalCollection: (
    collection: CollectionResponse | CollectionListItemResponse
  ) => void;
  onCollectionClick: (
    collection: CollectionResponse | CollectionListItemResponse
  ) => void;
  isOwner: boolean;
  showOwner: boolean;
}

export default function CollectionItem({
  collection,
  onSwitchArea,
  handleOpenModalCollection,
  onCollectionClick,
  isOwner,
  showOwner,
}: CollectionItemProps) {
  const [localIsPublic, setLocalIsPublic] = useState(collection.is_public);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const { deleteCollection, isDeletingCollection } = useCollections();
  const {
    localIsLiked,
    localLikesCount,
    likeBounce,
    isLiking,
    isUnliking,
    likeCooldown,
    handleLikeClick,
  } = useLikeButton({
    collectionId: collection.id,
    initialIsLiked: collection.is_liked_by_user,
    initialLikesCount: collection.likes_count,
  });

  useEffect(() => {
    setLocalIsPublic(collection.is_public);
  }, [collection.is_public]);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newValue = e.target.checked;
    setLocalIsPublic(newValue);
    setStatusMessage(
      newValue
        ? "Your collection is public and visible by other users now"
        : "Your collection is private and visible only by you"
    );
    setShowStatusToast(true);
    onSwitchArea(newValue);
  };

  const handleDelete = () => {
    if (collection.id < 0) {
      logger.warn("Cannot delete collection with temporary ID");
      setOpenDeleteDialog(false);
      return;
    }
    deleteCollection(collection.id);
    setOpenDeleteDialog(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleOpenModalCollection(collection);
  };

  return (
    <>
      <Card
        sx={{
          position: "relative",
          cursor: "pointer",
          "&:hover": { boxShadow: 6 },
          width: 320,
          height: 380,
          p: 0,
          m: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <IconButton
          onClick={handleLikeClick}
          disabled={isLiking || isUnliking || likeCooldown}
          sx={{
            color: localIsLiked ? "#FFD700" : "grey.400",
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            background: "rgba(30,30,30,0.5)",
            transition: "transform 0.15s, color 0.15s, background 0.15s",
            "&:hover": {
              background: "rgba(30,30,30,0.7)",
              transform: "scale(1.15)",
              color: "#FFD700",
            },
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          <FavoriteIcon sx={{ fontSize: "30px" }} />
        </IconButton>

        <Box
          onClick={() => onCollectionClick(collection)}
          component="img"
          src={vinylKeeperImg}
          alt="vinyl disc"
          sx={{
            width: "100%",
            height: 220,
            objectFit: "cover",
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            background: "#C9A726",
            opacity: 0.8,
          }}
        />

        <CardContent
          sx={{ flexGrow: 1, display: "flex", flexDirection: "column", p: 2, minHeight: 0 }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}
            >
              {collection.name}
            </Typography>
          </Box>

          <Typography
            variant="body2"
            color="text.secondary"
            gutterBottom
            sx={{ flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
          >
            {collection.description}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "auto", pt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {showOwner && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {collection.owner?.username || "Unknown"}
                  </Typography>
                </Box>
              )}
              {isOwner && (
                <FormControlLabel
                  control={<Switch checked={localIsPublic} onChange={handleToggle} size="small" />}
                  label={localIsPublic ? "Public" : "Private"}
                  sx={{ m: 0 }}
                />
              )}
            </Box>
            {isOwner && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title="Edit collection">
                  <span style={{ display: "inline-flex" }}>
                    <IconButton size="small" onClick={handleEdit} sx={{ color: "primary.main" }}>
                      <EditIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Delete collection">
                  <span style={{ display: "inline-flex" }}>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setOpenDeleteDialog(true); }}
                      disabled={collection.id < 0}
                      sx={{ color: collection.id < 0 ? "grey.400" : "primary.main", opacity: collection.id < 0 ? 0.5 : 1 }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Created on {formatDate(collection.created_at)}
              {!showOwner && <> by {truncateText(collection.owner?.username || "Unknown", 10)}</>}
            </Typography>
            {localLikesCount > 0 && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  color: "#fffbf9",
                  fontWeight: 600,
                  transition: "transform 0.3s cubic-bezier(.68,-0.55,.27,1.55)",
                  transform: likeBounce ? "scale(1.35)" : "scale(1)",
                  display: "inline-block",
                }}
              >
                +{localLikesCount} {localLikesCount === 1 ? "like" : "likes"}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {createPortal(
        <Snackbar
          open={showStatusToast}
          autoHideDuration={2000}
          onClose={() => setShowStatusToast(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowStatusToast(false)}
            severity="success"
            sx={{ backgroundColor: "green", color: "white", fontWeight: "bold", "& .MuiAlert-icon": { color: "white" } }}
          >
            {statusMessage}
          </Alert>
        </Snackbar>,
        document.body
      )}

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Delete Collection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this collection? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isDeletingCollection}>
            {isDeletingCollection ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
