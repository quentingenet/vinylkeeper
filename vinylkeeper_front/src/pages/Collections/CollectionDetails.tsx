import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCollectionDetails } from "@services/CollectionService";
import {
  Typography,
  Box,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import { useEffect } from "react";

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;

  const {
    data: collectionDetails,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["collectionDetails", collectionId],
    queryFn: () => getCollectionDetails(collectionId),
    enabled: !!collectionId,
  });

  useEffect(() => {
    if (collectionDetails) {
      document.title = `${collectionDetails.collection.name} - VinylKeeper`;
    }
    return () => {
      document.title = "VinylKeeper";
    };
  }, [collectionDetails]);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !collectionDetails) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          Collection not found
        </Typography>
      </Box>
    );
  }

  const {
    collection,
    local_albums,
    local_artists,
    local_genres,
    external_albums,
    external_artists,
  } = collectionDetails;

  return (
    <Box sx={{ padding: 3 }}>
      {/* Collection Header */}
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: "#C9A726" }}
      >
        {collection.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {collection.description}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Created on {new Date(collection.registered_at).toLocaleDateString()}
      </Typography>

      {/* Albums Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Albums ({local_albums.length + external_albums.length})
        </Typography>
        <Grid container spacing={2}>
          {/* Local Albums */}
          {local_albums.map((album) => (
            <Grid item xs={12} sm={6} md={4} key={`local-album-${album.id}`}>
              <Card
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2a2a2a",
                    margin: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#C9A726" }}>
                    ♪
                  </Typography>
                </Box>
                <CardContent sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "#fffbf9", fontWeight: "bold" }}
                  >
                    {album.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e4e4e4" }}>
                    {album.artist}
                  </Typography>
                  <Chip
                    label="Local"
                    size="small"
                    sx={{ mt: 1, backgroundColor: "#C9A726", color: "#000" }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* External Albums (Deezer) */}
          {external_albums.map((album) => (
            <Grid item xs={12} sm={6} md={4} key={`external-album-${album.id}`}>
              <Card
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    flexShrink: 0,
                    margin: 1,
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={album.picture_medium || "/default-album.png"}
                    alt={album.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #2a2a2a; color: #C9A726; font-size: 24px;">♪</div>';
                    }}
                  />
                </Box>
                <CardContent sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "#fffbf9", fontWeight: "bold" }}
                  >
                    {album.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e4e4e4" }}>
                    {album.artist_name || "Unknown Artist"}
                  </Typography>
                  <Chip
                    label="Deezer"
                    size="small"
                    sx={{ mt: 1, backgroundColor: "#00D4FF", color: "#000" }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Artists Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Artists ({local_artists.length + external_artists.length})
        </Typography>
        <Grid container spacing={2}>
          {/* Local Artists */}
          {local_artists.map((artist) => (
            <Grid item xs={12} sm={6} md={4} key={`local-artist-${artist.id}`}>
              <Card
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2a2a2a",
                    margin: 1,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="h6" sx={{ color: "#C9A726" }}>
                    ♫
                  </Typography>
                </Box>
                <CardContent sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "#fffbf9", fontWeight: "bold" }}
                  >
                    {artist.name}
                  </Typography>
                  <Chip
                    label="Local"
                    size="small"
                    sx={{ mt: 1, backgroundColor: "#C9A726", color: "#000" }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}

          {/* External Artists (Deezer) */}
          {external_artists.map((artist) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={`external-artist-${artist.id}`}
            >
              <Card
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    flexShrink: 0,
                    margin: 1,
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={artist.picture_medium || "/default-artist.png"}
                    alt={artist.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #2a2a2a; color: #C9A726; font-size: 24px;">♫</div>';
                    }}
                  />
                </Box>
                <CardContent sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{ color: "#fffbf9", fontWeight: "bold" }}
                  >
                    {artist.title}
                  </Typography>
                  <Chip
                    label="Deezer"
                    size="small"
                    sx={{ mt: 1, backgroundColor: "#00D4FF", color: "#000" }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Genres Section */}
      <Box>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Genres ({local_genres.length})
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {local_genres.map((genre) => (
            <Chip
              key={`genre-${genre.id}`}
              label={genre.name}
              sx={{
                backgroundColor: "#C9A726",
                color: "#000",
                fontWeight: "bold",
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
