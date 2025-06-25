import useDetectMobile from "@hooks/useDetectMobile";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
  IRequestResults,
  IRequestToSend,
  DiscogsData,
} from "@models/IRequestProxy";
import {
  Box,
  Switch,
  TextField,
  Typography,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import { searchApiService } from "@services/SearchApiService";
import { useState, useCallback, useMemo, memo } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { growItem } from "@utils/Animations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import VinylSpinner from "@components/UI/VinylSpinner";

interface IRequestsMakerProps {
  requestResults: IRequestResults[];
  setRequestResults: (results: IRequestResults[]) => void;
}

const SearchTypeSwitch = memo(
  ({
    isArtist,
    onSwitchChange,
  }: {
    isArtist: boolean;
    onSwitchChange: () => void;
  }) => (
    <Box
      onClick={onSwitchChange}
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
  )
);

SearchTypeSwitch.displayName = "SearchTypeSwitch";

const SearchInput = memo(
  ({
    searchTerm,
    setSearchTerm,
    isArtist,
    isMobile,
    mutation,
    requestResults,
    onSearch,
    error,
  }: {
    searchTerm: string;
    setSearchTerm: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isArtist: boolean;
    isMobile: boolean;
    mutation: any;
    requestResults: IRequestResults[];
    onSearch: () => void;
    error?: string;
  }) => (
    <Box
      sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }}
    >
      <TextField
        sx={{ width: isMobile ? "320px" : "400px" }}
        label={`Search by ${isArtist ? "artist" : "album"}`}
        variant="outlined"
        fullWidth
        value={searchTerm}
        onChange={setSearchTerm}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        error={!!error}
        helperText={error}
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
                    searchTerm !== "" &&
                    requestResults.length === 0 &&
                    !mutation.isPending
                      ? `${growItem} 1s ease infinite`
                      : "none",
                }}
                onClick={onSearch}
              >
                {mutation.isPending ? (
                  <VinylSpinner size={24} />
                ) : (
                  <SearchIcon fontSize="large" />
                )}
              </InputAdornment>
            ),
          },
        }}
      />
      {error && (
        <Alert severity="error" sx={{ width: isMobile ? "320px" : "400px" }}>
          {error}
        </Alert>
      )}
    </Box>
  )
);

SearchInput.displayName = "SearchInput";

export default function RequestsMaker({
  requestResults,
  setRequestResults,
}: IRequestsMakerProps) {
  const [isArtist, setIsArtist] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { isMobile } = useDetectMobile();
  const queryClient = useQueryClient();

  const requestToSend = useMemo(
    () => ({
      query: searchTerm,
      is_artist: isArtist,
    }),
    [searchTerm, isArtist]
  );

  const mutation = useMutation<DiscogsData[], Error, IRequestToSend>({
    mutationFn: searchApiService.searchMusic,
    onSuccess: (response) => {
      setError("");
      const transformedData = response.map((item: DiscogsData) => ({
        ...item,
        title: item.title || item.name || "",
      }));

      setRequestResults([
        {
          type: isArtist ? "artist" : "album",
          data: transformedData,
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ["requestResults"] });
    },
    onError: (error) => {
      console.error("Error fetching data:", error);
      setError(
        error.message || "An error occurred while searching. Please try again."
      );
    },
  });

  const handleSearchTermChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
    },
    []
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        width: "auto",
        margin: "0 auto",
      }}
    >
      <SearchTypeSwitch
        isArtist={isArtist}
        onSwitchChange={() => setIsArtist(!isArtist)}
      />
      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={handleSearchTermChange}
        isArtist={isArtist}
        isMobile={isMobile}
        mutation={mutation}
        requestResults={requestResults}
        onSearch={() => mutation.mutate(requestToSend)}
        error={error}
      />
    </Box>
  );
}
