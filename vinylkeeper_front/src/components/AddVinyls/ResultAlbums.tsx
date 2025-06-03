import { IAlbumRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import { Box, Typography, CardContent, Card, CardMedia } from "@mui/material";
import { truncateText } from "@utils/GlobalUtils";
import AddToCollectionModal from "./AddToCollectionModal";
import PlayButton from "@components/UI/PlayButton";
import PlaybackModal, { PlaybackItem } from "@components/Modals/PlaybackModal";
import { useState } from "react";

interface IResultAlbumsProps {
  data: IAlbumRequestResults[];
}

export default function ResultAlbums({ data }: IResultAlbumsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] =
    useState<IAlbumRequestResults | null>(null);
  const [playbackModalOpen, setPlaybackModalOpen] = useState(false);
  const [selectedPlaybackItem, setSelectedPlaybackItem] =
    useState<PlaybackItem | null>(null);

  const handleAlbumClick = (album: IAlbumRequestResults) => {
    setSelectedAlbum(album);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAlbum(null);
  };

  const handlePlayClick = (album: IAlbumRequestResults) => {
    const playbackItem: PlaybackItem = {
      id: album.uuid,
      title: album.title || "Unknown Album",
      artist: album.artist?.name || "Unknown Artist",
      source: "deezer",
      deezerId: album.id ? String(album.id) : "",
      pictureMedium: album.picture_medium || "",
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
        {data.map((album: IAlbumRequestResults) => (
          <Box key={album.uuid}>
            <Card
              className={styles.resultCard}
              sx={{
                width: 250,
                height: 300,
                borderRadius: "8px",
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => handleAlbumClick(album)}
            >
              <PlayButton
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayClick(album);
                }}
                position={{ top: 10, right: 10 }}
              />
              <CardMedia
                component="img"
                height="250"
                sx={{ objectFit: "contain" }}
                image={album.picture_medium}
                alt={album.title}
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
                  {album.title ? truncateText(album.title, 25) : ""}
                </Typography>
              </CardContent>
            </Card>
          </Box>
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
        itemType="album"
      />
    </>
  );
}
