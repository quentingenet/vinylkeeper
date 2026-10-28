import { logger } from "@utils/logger";
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
import vinylKeeperImg from "@assets/vinylKeeper.svg";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";
import EditionChips from "./EditionChips";

// Cover, two lines of title and two rows of edition chips
const CARD_HEIGHT = 390;

interface IResultAlbumsProps {
  data: IAlbumRequestResults[];
  isLoading?: boolean;
  // Replace mode: a click picks the pressing instead of opening the add modal
  onPickPressing?: (album: IAlbumRequestResults) => void;
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
  }) => (
    <Card
      className={styles.resultCard}
      sx={{
        width: 250,
        height: CARD_HEIGHT,
        borderRadius: "8px",
        cursor: "pointer",
        position: "relative",
        "&:hover": {
          transform: "scale(1.02)",
          transition: "transform 0.2s ease-in-out",
        },
      }}
      onClick={() => onAlbumClick(album)}
    >
      <CardMedia
        component="img"
        height="250"
        image={
          album.picture
            ? buildProxyImageUrl(album.picture, 500, 500, 80, false)
            : vinylKeeperImg
        }
        alt={album.title || "Album"}
        sx={{
          objectFit: "cover",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
        }}
      />
      <CardContent
        sx={{
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          minHeight: "80px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            textAlign: "center",
            lineHeight: 1.2,
            fontSize: "1rem",
            fontWeight: 500,
            wordBreak: "break-word",
          }}
        >
          {album.title || "Unknown Album"}
        </Typography>
        <EditionChips album={album} maxRows={2} />
      </CardContent>
      <PlayButton
        onClick={(e) => {
          e.stopPropagation();
          onPlayClick(album);
        }}
      />
    </Card>
  )
);

AlbumCard.displayName = "AlbumCard";

export default function ResultAlbums({
  data,
  isLoading = false,
  onPickPressing,
}: IResultAlbumsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] =
    useState<IAlbumRequestResults | null>(null);
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const handleAlbumClick = useCallback(
    (album: IAlbumRequestResults) => {
      if (onPickPressing) {
        onPickPressing(album);
        return;
      }
      setSelectedAlbum(album);
      setModalOpen(true);
    },
    [onPickPressing]
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedAlbum(null);
  }, []);

  const handlePlayClick = useCallback((album: IAlbumRequestResults) => {
    // Validate that album ID is numeric
    if (!/^\d+$/.test(album.id)) {
      logger.warn("Non-numeric album ID provided:", album.id, album);
      return;
    }

    const playbackItem: PlaybackItem = {
      id: album.id,
      title: album.title || "",
      artist: album.artist?.title || "",
      image_url: album.picture || vinylKeeperImg,
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
        {Array.from({ length: 6 }).map((_, index) => (
          <Box key={index}>
            <Card
              className={styles.resultCard}
              sx={{
                width: 250,
                height: CARD_HEIGHT,
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
          No album found
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
        onViewDetails={() => selectedAlbum && handlePlayClick(selectedAlbum)}
      />

      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
      />
    </>
  );
}
