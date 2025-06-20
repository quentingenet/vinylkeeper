import { IArtistRequestResults } from "@models/IRequestProxy";
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
import { truncateText } from "../../utils/GlobalUtils";
import vinylKeeperImg from "@assets/vinylKeeper.svg";

interface IResultArtistProps {
  data: IArtistRequestResults[];
  isLoading?: boolean;
}

const ArtistCard = memo(
  ({
    artist,
    onArtistClick,
    onPlayClick,
  }: {
    artist: IArtistRequestResults;
    onArtistClick: (artist: IArtistRequestResults) => void;
    onPlayClick: (artist: IArtistRequestResults) => void;
  }) => (
    <Card
      className={styles.resultCard}
      sx={{
        width: 250,
        height: 350,
        borderRadius: "8px",
        cursor: "pointer",
        "&:hover": {
          transform: "scale(1.02)",
          transition: "transform 0.2s ease-in-out",
        },
      }}
      onClick={() => onArtistClick(artist)}
    >
      <CardMedia
        component="img"
        height="250"
        image={artist.picture || vinylKeeperImg}
        alt={artist.name || "Artist"}
        sx={{
          objectFit: "cover",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
        }}
      />
      <CardContent>
        <Typography
          variant="h6"
          component="div"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textAlign: "center",
          }}
        >
          {truncateText(artist.name || "Unknown Artist", 30)}
        </Typography>
      </CardContent>
      <PlayButton
        onClick={(e) => {
          e.stopPropagation();
          onPlayClick(artist);
        }}
      />
    </Card>
  )
);

ArtistCard.displayName = "ArtistCard";

export default function ResultArtist({
  data,
  isLoading = false,
}: IResultArtistProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] =
    useState<IArtistRequestResults | null>(null);
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const handleArtistClick = useCallback((artist: IArtistRequestResults) => {
    setSelectedArtist(artist);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedArtist(null);
  }, []);

  const handlePlayClick = useCallback((artist: IArtistRequestResults) => {
    const playbackItem: PlaybackItem = {
      id: artist.id,
      title: artist.name || "",
      artist: artist.name || "",
      image_url: artist.picture || "",
      itemType: "artist",
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
                <Skeleton variant="text" height={40} />
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
          No artist found
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <div className={styles.resultsContainer}>
        {data.map((artist) => (
          <ArtistCard
            key={artist.uuid}
            artist={artist}
            onArtistClick={handleArtistClick}
            onPlayClick={handlePlayClick}
          />
        ))}
      </div>

      <AddToCollectionModal
        open={modalOpen}
        onClose={handleCloseModal}
        item={selectedArtist}
        itemType="artist"
      />

      <PlaybackModal
        isOpen={playbackModalOpen}
        onClose={handleClosePlaybackModal}
        item={selectedPlaybackItem}
      />
    </>
  );
}
