import { IArtistRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import { Box, Typography, CardContent, Card, CardMedia } from "@mui/material";
import { truncateText } from "@utils/GlobalUtils";
import AddToCollectionModal from "./AddToCollectionModal";
import PlayButton from "@components/UI/PlayButton";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { useState } from "react";

interface IResultArtistProps {
  data: IArtistRequestResults[];
}

export default function ResultArtist({ data }: IResultArtistProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedArtist, setSelectedArtist] =
    useState<IArtistRequestResults | null>(null);
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const handleArtistClick = (artist: IArtistRequestResults) => {
    setSelectedArtist(artist);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedArtist(null);
  };

  const handlePlayClick = (artist: IArtistRequestResults) => {
    const playbackItem: PlaybackItem = {
      id: artist.uuid,
      title: artist.name || "Unknown Artist",
      artist: artist.name || "Unknown Artist",
      source: "deezer",
      deezerId: artist.id ? String(artist.id) : "",
      pictureMedium: artist.picture_medium || "",
    };
    setSelectedPlaybackItem(playbackItem);
    setPlaybackModalOpen(true);
  };

  const handleClosePlaybackModal = () => {
    setPlaybackModalOpen(false);
    setSelectedPlaybackItem(null);
  };

  if (!data || data.length === 0) {
    return <></>;
  }

  return (
    <>
      <div className={styles.resultsContainer}>
        {data.map((artist: IArtistRequestResults) => (
          <Box key={artist.uuid}>
            <Card
              className={styles.resultCard}
              sx={{
                width: 250,
                height: 300,
                borderRadius: "8px",
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => handleArtistClick(artist)}
            >
              <PlayButton
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayClick(artist);
                }}
                position={{ top: 10, right: 10 }}
              />
              <CardMedia
                component="img"
                height="250"
                sx={{ objectFit: "contain" }}
                image={artist.picture_medium}
                alt={artist.name}
              />
              <CardContent
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "50px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1rem",
                    textAlign: "center",
                  }}
                  variant="h6"
                >
                  {artist.name ? truncateText(artist.name, 25) : ""}
                </Typography>
              </CardContent>
            </Card>
          </Box>
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
        itemType="artist"
      />
    </>
  );
}
