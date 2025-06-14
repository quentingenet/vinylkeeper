import useDetectMobile from "@hooks/useDetectMobile";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
  IRequestResults,
  IRequestToSend,
} from "@models/IRequestProxy";
import {
  Box,
  Switch,
  TextField,
  Typography,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { searchApiService } from "@services/SearchApiService";
import { useState, useCallback, useMemo } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { growItem } from "@utils/Animations";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface IRequestsMakerProps {
  requestResults: IRequestResults[];
  setRequestResults: (results: IRequestResults[]) => void;
}

export default function RequestsMaker({
  requestResults,
  setRequestResults,
}: IRequestsMakerProps) {
  const [isArtist, setIsArtist] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const requestToSend = useMemo(
    () => ({
      query: searchTerm,
      is_artist: isArtist,
    }),
    [searchTerm, isArtist]
  );

  const { isMobile } = useDetectMobile();

  const queryClient = useQueryClient();

  const mutation = useMutation<IRequestResults, Error, IRequestToSend>({
    mutationFn: searchApiService.searchProxy,
    onSuccess: (response) => {
      setRequestResults([
        {
          type: isArtist ? "artist" : "album",
          data: isArtist
            ? (response as unknown as IArtistRequestResults[])
            : (response as unknown as IAlbumRequestResults[]),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["requestResults"] });
    },
    onError: (error) => {
      console.error("Error fetching data:", error);
    },
    onSettled: () => {},
  });

  const handleSwitchChange = useCallback(() => {
    setIsArtist((prev) => !prev);
    setSearchTerm("");
    setRequestResults([]);
  }, [setRequestResults]);

  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      return;
    }
    mutation.mutate(requestToSend);
  }, [mutation, requestToSend, searchTerm]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        rowGap: 2,
      }}
    >
      <Box
        onClick={handleSwitchChange}
        sx={{
          cursor: "pointer",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography sx={{ paddingY: 1 }} variant="h3">
          Album
        </Typography>
        <Switch checked={isArtist} />
        <Typography sx={{ paddingY: 1 }} variant="h3">
          Artist
        </Typography>
      </Box>
      <TextField
        sx={{ width: isMobile ? "320px" : "400px" }}
        label={`Search by ${isArtist ? "artist" : "album"}`}
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        error={mutation.isError}
        helperText={
          mutation.isError ? "Error searching. Please try again." : ""
        }
        disabled={mutation.isPending}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{
                  cursor: mutation.isPending ? "not-allowed" : "pointer",
                  color: "white",
                  animation:
                    (requestResults.length === 0 || searchTerm === "") &&
                    !mutation.isPending
                      ? `${growItem} 1s ease infinite`
                      : "none",
                }}
                onClick={handleSearch}
              >
                {mutation.isPending ? (
                  <CircularProgress size={24} sx={{ color: "#C9A726" }} />
                ) : (
                  <SearchIcon fontSize="large" />
                )}
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
