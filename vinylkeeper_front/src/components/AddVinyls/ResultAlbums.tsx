import { IAlbumRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import {
  Box,
  Typography,
  CardContent,
  Card,
  CardMedia,
  Skeleton,
} from "@mui/material";
import AddToCollectionModal from "./AddToCollectionModal";
import PlayButton from "@components/UI/PlayButton";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { useState, useCallback, memo } from "react";
import { Album } from "@mui/icons-material";
import { truncateText } from "../../utils/GlobalUtils";

interface IResultAlbumsProps {
  data: IAlbumRequestResults[];
  isLoading?: boolean;
}

const AlbumCard = memo(
  ({
    album,
    onAlbumClick,
    onPlayClick,
  }: {
    album: IAlbumRequestResults;
    onAlbumClick: (album: IAlbumRequestResults) => void;
    onPlayClick: (album: IAlbumRequestResults) => void;
  }) => {
    const [imageError, setImageError] = useState(false);

    return (
      <Box key={album.uuid}>
        <Card
          className={styles.resultCard}
          sx={{
            width: 250,
            height: 350,
            borderRadius: "8px",
            cursor: "pointer",
            position: "relative",
            transition: "transform 0.2s ease-in-out",
            "&:hover": {
              transform: "scale(1.02)",
            },
          }}
          onClick={() => onAlbumClick(album)}
        >
          <PlayButton
            onClick={(e) => {
              e.stopPropagation();
              onPlayClick(album);
            }}
            position={{ top: 10, right: 10 }}
          />
          {album.picture && !imageError ? (
            <CardMedia
              component="img"
              height={250}
              sx={{ objectFit: "contain" }}
              image={album.picture}
              alt={album.title}
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <Box
              sx={{
                height: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Album
                sx={{
                  opacity: 0.7,
                  width: 150,
                  height: 150,
                  color: "#C9A726",
                }}
              />
            </Box>
          )}
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "60px",
              gap: 0.5,
            }}
          >
            <Typography
              sx={{
                fontSize: "1.4rem",
                textAlign: "center",
                color: "#C9A726",
                fontWeight: "bold",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.2,
                height: "2.4em",
                width: "100%",
              }}
            >
              {truncateText(album.title?.split(" - ")[0] || "", 20)}
            </Typography>
            <Typography
              sx={{
                fontSize: "1rem",
                textAlign: "center",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: 1.2,
                height: "2.4em",
                width: "100%",
              }}
              variant="h6"
            >
              {truncateText(
                album.title?.split(" - ")[1] || album.title || "",
                20
              )}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }
);

AlbumCard.displayName = "AlbumCard";

export default function ResultAlbums({
  data,
  isLoading = false,
}: IResultAlbumsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] =
    useState<IAlbumRequestResults | null>(null);
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const handleAlbumClick = useCallback((album: IAlbumRequestResults) => {
    setSelectedAlbum(album);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedAlbum(null);
  }, []);

  const handlePlayClick = useCallback((album: IAlbumRequestResults) => {
    const playbackItem: PlaybackItem = {
      id: album.id.toString(),
      title: album.title || "",
      artist: album.artist?.name || "",
      picture: album.picture || "",
      itemType: "album",
    };
    setSelectedPlaybackItem(playbackItem);
    setPlaybackModalOpen(true);
  }, []);

  const handleClosePlaybackModal = useCallback(() => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  }, []);

  if (isLoading) {
    return (
      <div className={styles.resultsContainer}>
        {[...Array(6)].map((_, index) => (
          <Box key={index}>
            <Card
              className={styles.resultCard}
              sx={{
                width: 250,
                height: 350,
                borderRadius: "8px",
              }}
            >
              <Skeleton variant="rectangular" height={250} />
              <CardContent>
                <Skeleton variant="text" height={30} />
                <Skeleton variant="text" height={20} />
              </CardContent>
            </Card>
          </Box>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 4,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Aucun album trouvé
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <div className={styles.resultsContainer}>
        {data.map((album) => (
          <AlbumCard
            key={album.uuid}
            album={album}
            onAlbumClick={handleAlbumClick}
            onPlayClick={handlePlayClick}
          />
        ))}
      </div>

      <AddToCollectionModal
        open={modalOpen}
        onClose={handleCloseModal}
        item={selectedAlbum}
        itemType="album"
      />

      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
      />
    </>
  );
}
