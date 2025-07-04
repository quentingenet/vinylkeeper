import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "@contexts/UserContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collectionApiService,
  type CollectionResponse,
} from "@services/CollectionApiService";
import { ICollection } from "@models/ICollectionForm";
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
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PersonIcon from "@mui/icons-material/Person";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { truncateText } from "@utils/GlobalUtils";
import { useCollectionLike } from "@hooks/useCollectionLike";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

/**
 * CollectionItem Component
 *
 * A card component that displays a collection's information and provides actions to:
 * - Toggle public/private visibility
 * - Delete the collection
 * - Edit the collection
 * - View the collection details
 *
 * @component
 * @param {Object} props
 * @param {ICollection} props.collection - The collection object containing id, name, description etc
 * @param {Function} props.onSwitchArea - Callback when public/private toggle is switched
 * @param {Function} props.handleOpenModalCollection - Callback to open edit collection modal
 * @param {Function} props.onCollectionClick - Callback when collection card is clicked
 * @param {boolean} props.isOwner - Whether the current user is the owner of the collection
 * @param {boolean} props.showOwner - Whether to show the owner's name instead of the creation date
 *
 * @example
 * <CollectionItem
 *   collection={collectionData}
 *   onSwitchArea={(isPublic) => handleAreaSwitch(isPublic)}
 *   handleOpenModalCollection={openEditModal}
 *   onCollectionClick={(id) => navigateToCollection(id)}
 *   isOwner={isOwner}
 *   showOwner={showOwner}
 * />
 */

interface CollectionItemProps {
  collection: CollectionResponse;
  onSwitchArea: (isPublic: boolean) => void;
  handleOpenModalCollection: (collection: CollectionResponse) => void;
  onCollectionClick: (collection: CollectionResponse) => void;
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
  const [localIsLiked, setLocalIsLiked] = useState(collection.is_liked_by_user);
  const [localLikesCount, setLocalLikesCount] = useState(
    collection.likes_count
  );
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const userContext = useUserContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { like, unlike, isLiking, isUnliking } = useCollectionLike(
    collection.id
  );
  const [likeBounce, setLikeBounce] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => collectionApiService.deleteCollection(collection.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setOpenDeleteDialog(false);
    },
    onError: (error) => {
      console.error("Error deleting collection:", error);
    },
  });

  useEffect(() => {
    setLocalIsPublic(collection.is_public);
  }, [collection.is_public]);

  useEffect(() => {
    setLocalIsLiked(collection.is_liked_by_user);
    setLocalLikesCount(collection.likes_count);
  }, [collection.id, collection.is_liked_by_user, collection.likes_count]);

  // Force reset local states when collection ID changes
  useEffect(() => {
    setLocalIsLiked(collection.is_liked_by_user);
    setLocalLikesCount(collection.likes_count);
  }, [collection.id]);

  useEffect(() => {
    if (likeBounce) return;
    setLikeBounce(true);
    const timeout = setTimeout(() => setLikeBounce(false), 350);
    return () => clearTimeout(timeout);
  }, [localLikesCount]);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newValue = e.target.checked;
    setLocalIsPublic(newValue);
    onSwitchArea(newValue);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleOpenModalCollection(collection);
  };

  const handleCardClick = () => {
    onCollectionClick(collection);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (localIsLiked) {
      setLocalIsLiked(false);
      setLocalLikesCount((prev) => Math.max(0, prev - 1));
      unlike();
    } else {
      setLocalIsLiked(true);
      setLocalLikesCount((prev) => prev + 1);
      like();
    }
  };

  return (
    <Card
      ref={cardRef}
      sx={{
        position: "relative",
        cursor: "pointer",
        "&:hover": {
          boxShadow: 6,
        },
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
        disabled={isLiking || isUnliking}
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
          "&:active": {
            transform: "scale(0.95)",
          },
        }}
      >
        <FavoriteIcon sx={{ fontSize: "30px" }} />
      </IconButton>
      <Box
        onClick={handleCardClick}
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
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          p: 2,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 200,
            }}
          >
            {collection.name}
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          gutterBottom
          sx={{
            flexShrink: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {collection.description}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: "auto",
            pt: 2,
          }}
        >
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
                control={
                  <Switch
                    checked={localIsPublic}
                    onChange={handleToggle}
                    size="small"
                  />
                }
                label={localIsPublic ? "Public" : "Private"}
                sx={{ m: 0 }}
              />
            )}
          </Box>
          {isOwner && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="Edit collection">
                <span style={{ display: "inline-flex" }}>
                  <IconButton
                    size="small"
                    onClick={handleEdit}
                    sx={{ color: "primary.main" }}
                  >
                    <EditIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Delete collection">
                <span style={{ display: "inline-flex" }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDeleteDialog(true);
                    }}
                    sx={{ color: "primary.main" }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Created on {formatDate(collection.created_at)} by{" "}
            {truncateText(collection.owner?.username || "Unknown", 10)}
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
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Delete Collection</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this collection? This action cannot
            be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
