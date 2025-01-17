import { IArtistRequestResults } from "@models/IRequestProxy";
import styles from "../../styles/pages/AddVinyls.module.scss";
import { Box, Typography, CardContent, Card, CardMedia } from "@mui/material";
import { truncateText } from "@utils/GlobalUtils";

interface IResultArtistProps {
  data: IArtistRequestResults[];
}

export default function ResultArtist({ data }: IResultArtistProps) {
  if (!data || data.length === 0) {
    return (
      <Typography
        sx={{ textAlign: "center", marginTop: 2, fontSize: "1rem" }}
        variant="body1"
      >
        No artists found.
      </Typography>
    );
  }

  return (
    <div className={styles.resultsContainer}>
      {data.map((artist: IArtistRequestResults) => (
        <Box key={artist.uuid}>
          <Card className={styles.resultCard} sx={{ width: 250, height: 250 }}>
            <CardMedia
              component="img"
              height="190"
              image={artist.picture_medium}
              alt={artist.name}
            />
            <CardContent>
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
  );
}
