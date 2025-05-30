import { IAlbumRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import { Box, Typography, CardContent, Card, CardMedia } from "@mui/material";
import { truncateText } from "@utils/GlobalUtils";
import AddToCollectionModal from "./AddToCollectionModal";
import { useState } from "react";

interface IResultAlbumsProps {
  data: IAlbumRequestResults[];
}

export default function ResultAlbums({ data }: IResultAlbumsProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] =
    useState<IAlbumRequestResults | null>(null);

  const handleAlbumClick = (album: IAlbumRequestResults) => {
    setSelectedAlbum(album);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAlbum(null);
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
              }}
              onClick={() => handleAlbumClick(album)}
            >
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
    </>
  );
}
