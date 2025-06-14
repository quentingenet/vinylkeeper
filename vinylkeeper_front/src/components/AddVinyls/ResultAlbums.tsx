import { IAlbumRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import { Box, Typography, CardContent, Card, CardMedia } from "@mui/material";
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
      id: album.id.toString(),
      title: album.title || "",
      artist: album.artist?.name || "",
      picture: album.picture || "",
      itemType: "album",
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
                height: 350,
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
                width={250}
                sx={{ objectFit: "contain" }}
                image={album.picture}
                alt={album.title}
              />
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "60px",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "1.4rem",
                    textAlign: "center",
                    color: "#C9A726",
                    fontWeight: "bold",
                  }}
                >
                  {album.title?.split(" - ")[0] || ""}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "1rem",
                    textAlign: "center",
                  }}
                  variant="h6"
                >
                  {album.title?.split(" - ")[1] || album.title || ""}
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
      />
    </>
  );
}
