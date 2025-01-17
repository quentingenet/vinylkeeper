import { IAlbumRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import { Box, Typography, CardContent, Card, CardMedia } from "@mui/material";
import { truncateText } from "@utils/GlobalUtils";

interface IResultAlbumsProps {
  data: IAlbumRequestResults[];
}

export default function ResultAlbums({ data }: IResultAlbumsProps) {
  if (!data || data.length === 0) {
    return (
      <Typography
        sx={{ textAlign: "center", marginTop: 2, fontSize: "1rem" }}
        variant="body1"
      >
        No albums found.
      </Typography>
    );
  }

  return (
    <div className={styles.resultsContainer}>
      {data.map((album: IAlbumRequestResults) => (
        <Box key={album.uuid}>
          <Card className={styles.resultCard} sx={{ width: 250, height: 250 }}>
            <CardMedia
              sx={{ objectFit: "cover" }}
              component="img"
              height="auto"
              image={album.picture_medium}
              alt={album.title}
            />
            <CardContent>
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
  );
}
