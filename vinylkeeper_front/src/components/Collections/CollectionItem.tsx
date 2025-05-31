import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import { Box, FormControlLabel, Switch } from "@mui/material";
import { truncateText } from "@utils/GlobalUtils";
import { useState, useEffect, useRef } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { collectionApiService } from "@services/CollectionApiService";
import { ICollection } from "@models/ICollectionForm";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import { zoomIn } from "@utils/Animations";
import VinylKeeperDialog from "@components/UI/VinylKeeperDialog";
import { useUserContext } from "@contexts/UserContext";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { useNavigate } from "react-router-dom";

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
 * @param {Function} props.refreshCollections - Callback to refresh the collections list
 * @param {Function} props.handleOpenModalCollection - Callback to open edit collection modal
 * @param {Function} props.onCollectionClick - Callback when collection card is clicked
 * @param {boolean} props.isOwner - Whether the current user is the owner of the collection
 * @param {boolean} props.showOwner - Whether to show the owner's name instead of the creation date
 *
 * @example
 * <CollectionItem
 *   collection={collectionData}
 *   onSwitchArea={(isPublic) => handleAreaSwitch(isPublic)}
 *   refreshCollections={refreshCollectionsList}
 *   handleOpenModalCollection={openEditModal}
 *   onCollectionClick={(id) => navigateToCollection(id)}
 *   isOwner={isOwner}
 *   showOwner={showOwner}
 * />
 */

interface CollectionItemProps {
  collection: ICollection;
  onSwitchArea: (newIsPublic: boolean) => void;
  refreshCollections: () => void;
  handleOpenModalCollection: () => void;
  onCollectionClick: (collectionId: number) => void;
  isOwner?: boolean;
  showOwner?: boolean;
}

export default function CollectionItem({
  collection,
  onSwitchArea,
  refreshCollections,
  handleOpenModalCollection,
  onCollectionClick,
  isOwner,
  showOwner,
}: CollectionItemProps) {
  const [localIsPublic, setLocalIsPublic] = useState(collection.is_public);
  const [isDeleted, setIsDeleted] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const userContext = useUserContext();
  const navigate = useNavigate();

  useEffect(() => {
    setLocalIsPublic(collection.is_public);
  }, [collection.is_public]);

  useEffect(() => {
    if (isDeleted) {
      refreshCollections();
    }
  }, [isDeleted, refreshCollections]);

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setLocalIsPublic(newValue);
    onSwitchArea(newValue);
  };

  const handleDelete = () => {
    collectionApiService.deleteCollection(collection.id).then(() => {
      setIsDeleted(true);
      setOpenDeleteDialog(false);
    });
  };

  return (
    <>
      <Card
        ref={cardRef}
        sx={{
          width: 320,
          position: "relative",
          boxShadow: "0px 0px 3px 0px #000000",
          transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
          "&:hover": {
            boxShadow: "0px 0px 6px 0px #000000",
          },
        }}
        onClick={() => onCollectionClick(collection.id)}
      >
        <CardMedia
          component="img"
          height="140"
          sx={{
            objectFit: "cover",
            backgroundColor: "#C9A726",
            opacity: 0.8,
            height: 200,
          }}
          image="/images/vinylKeeper.svg"
          alt="VinylKeeper"
        ></CardMedia>
        <Box display={"flex"} flexDirection={"column"} alignItems={"flex-end"}>
          <Box
            sx={{
              position: "absolute",
              cursor: "pointer",
              backgroundColor: "#1F1F1F",
              borderRadius: "50%",
              padding: 1,
              top: 10,
              right: 10,
              opacity: 0.9,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              "&:hover": {
                animation: `${zoomIn} 0.3s ease-in-out`,
              },
            }}
          >
            <VisibilityIcon
              onClick={(e) => {
                e.stopPropagation();
                navigate(
                  EGlobalUrls.COLLECTION_DETAILS.replace(
                    ":id",
                    collection.id.toString()
                  )
                );
              }}
              fontSize="small"
            />
          </Box>
          {(isOwner ?? true) && (
            <>
              <Box
                onClick={() => handleOpenModalCollection()}
                sx={{
                  position: "absolute",
                  cursor: "pointer",
                  backgroundColor: "#1F1F1F",
                  borderRadius: "50%",
                  padding: 1,
                  top: 53,
                  right: 10,
                  opacity: 0.9,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  "&:hover": {
                    animation: `${zoomIn} 0.3s ease-in-out`,
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </Box>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDeleteDialog(true);
                }}
                sx={{
                  position: "absolute",
                  cursor: "pointer",
                  backgroundColor: "#1F1F1F",
                  borderRadius: "50%",
                  padding: 1,
                  top: 94,
                  right: 10,
                  opacity: 0.9,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  "&:hover": {
                    animation: `${zoomIn} 0.3s ease-in-out`,
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </Box>
            </>
          )}
        </Box>
        <CardActionArea>
          <CardContent>
            <Typography
              gutterBottom
              variant="h5"
              component="div"
              sx={{ textShadow: "0px 0px 3px #000000", height: 50 }}
            >
              {truncateText(collection.name, 25)}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {truncateText(collection.description, 50)}
            </Typography>
          </CardContent>
        </CardActionArea>

        <CardActions>
          <Box
            display={"flex"}
            flexDirection={"row"}
            justifyContent={"center"}
            alignItems={"flex-end"}
            gap={1}
          >
            {(isOwner ?? true) && (
              <FormControlLabel
                sx={{ paddingX: 1 }}
                control={
                  <Switch
                    size="small"
                    color="default"
                    checked={localIsPublic}
                    onChange={handleToggle}
                  />
                }
                label={localIsPublic ? "Public" : "Private"}
              />
            )}
            <Typography variant="body2" sx={{ position: "absolute", right: 8 }}>
              {showOwner
                ? `Created ${new Date(
                    collection.registered_at
                  ).toLocaleDateString()} by ${truncateText(
                    collection.owner.username,
                    10
                  )}`
                : `Created at ${new Date(
                    collection.registered_at
                  ).toLocaleDateString()}`}
            </Typography>
          </Box>
        </CardActions>
      </Card>
      <VinylKeeperDialog
        title="Delete collection"
        content="Are you sure you want to delete this collection ?"
        onConfirm={handleDelete}
        textConfirm="Delete"
        textCancel="Cancel"
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      />
    </>
  );
}
