import { logger } from "@utils/logger";
import { useState, useEffect } from "react";
import {
  type CollectionResponse,
  type CollectionListItemResponse,
} from "@services/CollectionApiService";
import { useCollections, useSaveCollectionCopy } from "@hooks/useCollections";
import { useLikeButton } from "@hooks/useLikeButton";
import CoverMosaic from "@components/Collections/CoverMosaic";
import ShareCollectionButton from "@components/Collections/ShareCollectionButton";
import {
  COLLECTION_CARD_MARGIN,
  COLLECTION_CARD_WIDTH,
} from "@components/Collections/collectionGridLayout";
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
  TextField,
  Stack,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import PersonIcon from "@mui/icons-material/Person";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { truncateText } from "@utils/GlobalUtils";
import { isApiError } from "@utils/apiError";
import { oneSaveMessage } from "@components/Collections/discogsImportLabels";
import { createPortal } from "react-dom";
import { colors } from "@styles/colors";
import { Trans, useTranslation } from "react-i18next";
import { formatLocale } from "@utils/i18n";

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString(formatLocale());

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
  const { t } = useTranslation("collections");
  // The full CollectionResponse has no list-view fields: derive them
  const previewImages =
    "preview_images" in collection ? collection.preview_images ?? [] : [];
  const albumsCount =
    "albums_count" in collection ? collection.albums_count : collection.albums.length;
  const artistsCount =
    "artists_count" in collection ? collection.artists_count : collection.artists.length;
  const [localIsPublic, setLocalIsPublic] = useState(collection.is_public);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  // Same safeguard as the account deletion: the word typed, not a single click
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showStatusToast, setShowStatusToast] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusSeverity, setStatusSeverity] = useState<"success" | "error">("success");

  const { deleteCollection, isDeletingCollection } = useCollections();
  const saveCopy = useSaveCollectionCopy();
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
        ? t("item.nowPublic")
        : t("item.nowPrivate")
    );
    setStatusSeverity("success");
    setShowStatusToast(true);
    onSwitchArea(newValue);
  };

  const showToast = (message: string, severity: "success" | "error") => {
    setStatusMessage(message);
    setStatusSeverity(severity);
    setShowStatusToast(true);
  };

  const isSave = "saved_from_collection_id" in collection && collection.saved_from_collection_id != null;
  const existingSaveName =
    "save_collection_name" in collection ? collection.save_collection_name ?? null : null;

  const handleSaveCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    // One save per collection: explained right away, the API refuses it anyway
    if (existingSaveName) {
      showToast(oneSaveMessage(existingSaveName), "error");
      return;
    }
    saveCopy.mutate(collection.id, {
      onSuccess: (copy) => showToast(t("item.savedAs", { name: copy.name }), "success"),
      onError: (error) =>
        showToast(isApiError(error) ? error.message : t("item.saveFailed"), "error"),
    });
  };

  // What the delete dialog says goes away with the collection
  const deletedContents = [
    t("counts.records", { count: albumsCount }),
    t("counts.artists", { count: artistsCount }),
    t("counts.likes", { count: localLikesCount }),
  ].join(", ");

  const closeDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setDeleteConfirmation("");
  };

  const handleDelete = () => {
    if (deleteConfirmation !== "DELETE") return;
    if (collection.id < 0) {
      logger.warn("Cannot delete collection with temporary ID");
      setOpenDeleteDialog(false);
      return;
    }
    deleteCollection(collection.id);
    closeDeleteDialog();
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
          width: COLLECTION_CARD_WIDTH,
          height: 380,
          p: 0,
          m: COLLECTION_CARD_MARGIN,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <IconButton
          onClick={handleLikeClick}
          disabled={isLiking || isUnliking || likeCooldown}
          sx={{
            color: localIsLiked ? colors.likeGold : "grey.400",
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            background: "rgba(30,30,30,0.5)",
            transition: "transform 0.15s, color 0.15s, background 0.15s",
            "&:hover": {
              background: "rgba(30,30,30,0.7)",
              transform: "scale(1.15)",
              color: colors.likeGold,
            },
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          <FavoriteIcon sx={{ fontSize: "30px" }} />
        </IconButton>
        <ShareCollectionButton
          shareToken={collection.share_token}
          name={collection.name}
          ownerUsername={collection.owner?.username}
          isPublic={localIsPublic}
          sx={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}
        />

        <Box
          onClick={() => onCollectionClick(collection)}
          sx={{ position: "relative", flexShrink: 0 }}
        >
          {/* key resets the broken-cover state when the covers change */}
          <CoverMosaic key={previewImages.join("|")} images={previewImages} />
          <Typography
            variant="caption"
            data-testid="collection-content-counts"
            sx={{
              position: "absolute",
              left: 8,
              bottom: 8,
              px: 1,
              py: 0.25,
              borderRadius: 1,
              color: "common.white",
              background: "rgba(30,30,30,0.7)",
              fontWeight: 600,
            }}
          >
            {t("counts.albums", { count: albumsCount })} · {t("counts.artists", { count: artistsCount })}
          </Typography>
        </Box>

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
            gutterBottom
            sx={{
              color: "text.secondary",
              flexShrink: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {collection.description}
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "auto", pt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {showOwner && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {collection.owner?.username || t("item.unknownOwner")}
                  </Typography>
                </Box>
              )}
              {isOwner && (
                <FormControlLabel
                  control={<Switch checked={localIsPublic} onChange={handleToggle} size="small" />}
                  label={localIsPublic ? t("item.public") : t("item.private")}
                  sx={{ m: 0 }}
                />
              )}
            </Box>
            {isOwner && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Tooltip title={t("item.edit")}>
                  <span style={{ display: "inline-flex" }}>
                    <IconButton size="small" aria-label={t("item.edit")} onClick={handleEdit} sx={{ color: "primary.main" }}>
                      <EditIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                {!isSave && (
                  <Tooltip
                    title={existingSaveName ? t("item.alreadySaved", { name: existingSaveName }) : t("item.saveCopy")}
                  >
                    <span style={{ display: "inline-flex" }}>
                      <IconButton
                        size="small"
                        aria-label={t("item.save")}
                        onClick={handleSaveCopy}
                        disabled={collection.id < 0 || saveCopy.isPending}
                        sx={{ color: "primary.main" }}
                      >
                        <SaveIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
                <Tooltip title={t("item.delete")}>
                  <span style={{ display: "inline-flex" }}>
                    <IconButton
                      size="small"
                      aria-label={t("item.delete")}
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

          <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", mt: 1, display: "block" }}>
              {t("item.createdOn", { date: formatDate(collection.created_at) })}
              {!showOwner && t("item.byOwner", { name: truncateText(collection.owner?.username || t("item.unknownOwner"), 10) })}
            </Typography>
            {localLikesCount > 0 && (
              <Typography
                variant="body2"
                sx={{
                  color: colors.textLight,
                  fontWeight: 600,
                  transition: "transform 0.3s cubic-bezier(.68,-0.55,.27,1.55)",
                  transform: likeBounce ? "scale(1.35)" : "scale(1)",
                  display: "inline-block",
                }}
              >
                {t("counts.plusLikes", { count: localLikesCount })}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {createPortal(
        <Snackbar
          open={showStatusToast}
          autoHideDuration={statusSeverity === "error" ? 5000 : 3000}
          onClose={() => setShowStatusToast(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setShowStatusToast(false)}
            severity={statusSeverity}
            sx={{
              backgroundColor: statusSeverity === "error" ? "error.main" : "green",
              color: "white",
              fontWeight: "bold",
              "& .MuiAlert-icon": { color: "white" },
            }}
          >
            {statusMessage}
          </Alert>
        </Snackbar>,
        document.body
      )}

      <Dialog open={openDeleteDialog} onClose={closeDeleteDialog} onClick={(e) => e.stopPropagation()}>
        <DialogTitle>{t("item.deleteTitle", { name: collection.name })}</DialogTitle>
        <DialogContent>
          <Typography>
            <Trans
              t={t}
              i18nKey="item.deleteText"
              values={{ name: collection.name, contents: deletedContents }}
              components={{ strong: <strong /> }}
            />
          </Typography>
          {!isSave && !existingSaveName && albumsCount > 0 && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 1.5 }}>
              {t("item.keepCopyFirst")}
            </Typography>
          )}
          <TextField
            fullWidth
            sx={{ mt: 2 }}
            placeholder={t("settingsUsersVk:danger.placeholder")}
            label={t("settingsUsersVk:danger.confirmLabel")}
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            autoComplete="off"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>{t("common:actions.cancel")}</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteConfirmation !== "DELETE" || isDeletingCollection}
          >
            {isDeletingCollection ? t("common:actions.deleting") : t("common:actions.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
