import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCollectionDetails } from "@services/CollectionService";
import {
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Chip,
} from "@mui/material";
import { useEffect } from "react";
import useDetectMobile from "@hooks/useDetectMobile";

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;
  const { isMobile } = useDetectMobile();

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

        {local_albums.length + external_albums.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100px"
          >
            <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
              No albums in this collection
            </Typography>
          </Box>
        ) : (
          <Box
            display={isMobile ? "flex" : "grid"}
            flexDirection={isMobile ? "column" : "row"}
            flexWrap={isMobile ? "nowrap" : "wrap"}
            gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
            justifyContent={isMobile ? "center" : "flex-start"}
            alignItems={isMobile ? "center" : "flex-start"}
            gap={4}
            marginY={isMobile ? 1 : 3}
          >
            {/* Local Albums */}
            {local_albums.map((album) => (
              <Card
                key={`local-album-${album.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2a2a2a",
                  }}
                >
                  <Typography variant="h1" sx={{ color: "#C9A726" }}>
                    ♪
                  </Typography>
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "4px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.artist}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#fffbf9",
                      marginBottom: "8px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {/* External Albums (Deezer) */}
            {external_albums.map((album) => (
              <Card
                key={`external-album-${album.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={album.picture_medium || "/default-album.png"}
                    alt={album.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #2a2a2a; color: #C9A726; font-size: 24px;">♪</div>';
                    }}
                  />
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "4px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.artist_name || "Unknown Artist"}
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: "#fffbf9",
                      marginBottom: "8px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {album.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Artists Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Artists ({local_artists.length + external_artists.length})
        </Typography>

        {local_artists.length + external_artists.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100px"
          >
            <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
              No artists in this collection
            </Typography>
          </Box>
        ) : (
          <Box
            display={isMobile ? "flex" : "grid"}
            flexDirection={isMobile ? "column" : "row"}
            flexWrap={isMobile ? "nowrap" : "wrap"}
            gridTemplateColumns={isMobile ? "repeat(1, 1fr)" : "repeat(3, 1fr)"}
            justifyContent={isMobile ? "center" : "flex-start"}
            alignItems={isMobile ? "center" : "flex-start"}
            gap={4}
            marginY={isMobile ? 1 : 3}
          >
            {/* Local Artists */}
            {local_artists.map((artist) => (
              <Card
                key={`local-artist-${artist.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2a2a2a",
                  }}
                >
                  <Typography variant="h1" sx={{ color: "#C9A726" }}>
                    ♫
                  </Typography>
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {artist.name}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {/* External Artists (Deezer) */}
            {external_artists.map((artist) => (
              <Card
                key={`external-artist-${artist.id}`}
                sx={{
                  backgroundColor: "#3f3f41",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: 250,
                  borderRadius: "8px",
                }}
              >
                <Box
                  sx={{
                    width: "100%",
                    height: 250,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={artist.picture_medium || "/default-artist.png"}
                    alt={artist.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML =
                        '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-color: #2a2a2a; color: #C9A726; font-size: 24px;">♫</div>';
                    }}
                  />
                </Box>
                <CardContent
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    height: "100px",
                    padding: "16px",
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    sx={{
                      color: "#C9A726",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {artist.title}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Genres Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ color: "#C9A726", mb: 2 }}>
          Genres ({local_genres.length})
        </Typography>
        {local_genres.length === 0 ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="100px"
          >
            <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
              No genres in this collection
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={1}>
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
        )}
      </Box>
    </Box>
  );
}
