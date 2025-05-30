import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getWishlistItems,
  removeFromWishlist,
} from "@services/WishlistService";
import {
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  Snackbar,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useState } from "react";
import { IWishlistItem } from "@models/IWishlist";
import useDetectMobile from "@hooks/useDetectMobile";

export default function Wishlist() {
  const [successMessage, setSuccessMessage] = useState<string>("");
  const queryClient = useQueryClient();
  const { isMobile } = useDetectMobile();

  const {
    data: wishlistItems,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["wishlistItems"],
    queryFn: getWishlistItems,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlistItems"] });
      setSuccessMessage("Item removed from wishlist!");
    },
    onError: (error) => {
      console.error("Error removing from wishlist:", error);
      setSuccessMessage("Error removing item from wishlist");
    },
  });

  const handleRemoveItem = (externalReferenceId: number) => {
    removeFromWishlistMutation.mutate(externalReferenceId);
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress sx={{ color: "#C9A726" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ padding: 3 }}>
        <Typography variant="h6" color="error">
          Error loading wishlist
        </Typography>
      </Box>
    );
  }

  const items = wishlistItems || [];

  return (
    <Box>
      {items.length === 0 ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <Typography variant="h6" sx={{ color: "#e4e4e4" }}>
            Your wishlist is empty
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
          {items.map((item: IWishlistItem) => (
            <Card
              key={`wishlist-item-${item.id}`}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveItem(item.id);
                }}
                sx={{
                  position: "absolute",
                  cursor: "pointer",
                  backgroundColor: "#1F1F1F",
                  borderRadius: "50%",
                  padding: 1,
                  top: 10,
                  right: 10,
                  opacity: 0.9,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  "&:hover": {
                    backgroundColor: "#333",
                  },
                  zIndex: 1,
                }}
              >
                <DeleteIcon fontSize="small" sx={{ color: "#ffffff" }} />
              </Box>

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
                  src={item.picture_medium || "/default-album.png"}
                  alt={item.title}
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
                  {item.artist_name || "Unknown Artist"}
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
                  {item.title}
                </Typography>
                <Typography variant="caption" sx={{ color: "#888" }}>
                  Added {new Date(item.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity={successMessage.includes("Error") ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
