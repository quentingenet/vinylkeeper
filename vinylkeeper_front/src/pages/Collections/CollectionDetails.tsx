import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCollectionById } from "@services/CollectionService";
import { Typography, Box, CircularProgress } from "@mui/material";
import { useEffect } from "react";

export default function CollectionDetails() {
  const { id } = useParams<{ id: string }>();
  const collectionId = id ? parseInt(id) : 0;

  const {
    data: collection,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["collection", collectionId],
    queryFn: () => getCollectionById(collectionId),
    enabled: !!collectionId,
  });

  useEffect(() => {
    if (collection) {
      document.title = `${collection.name} - VinylKeeper`;
    }
    return () => {
      document.title = "VinylKeeper";
    };
  }, [collection]);

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

  if (error || !collection) {
    return (
      <Box>
        <Typography variant="h6" color="error">
          Collection not found
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {collection.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {collection.description}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Created on {new Date(collection.registered_at).toLocaleDateString()}
      </Typography>
    </Box>
  );
}
