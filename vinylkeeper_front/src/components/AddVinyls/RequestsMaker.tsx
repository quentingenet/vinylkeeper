import useDetectMobile from "@hooks/useDetectMobile";
import {
  Box,
  Switch,
  TextField,
  Typography,
  InputAdornment,
  Alert,
} from "@mui/material";
import { useState, useCallback, memo } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { growItem } from "@utils/Animations";
import VinylSpinner from "@components/UI/VinylSpinner";

interface IRequestsMakerProps {
  initialQuery?: string;
  hasResults: boolean;
  isSearching: boolean;
  error?: string;
  onSearch: (query: string, isArtist: boolean) => void;
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
    isSearching,
    hasResults,
    onSearch,
    error,
  }: {
    searchTerm: string;
    setSearchTerm: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isArtist: boolean;
    isMobile: boolean;
    isSearching: boolean;
    hasResults: boolean;
    onSearch: () => void;
    error?: string;
  }) => (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
      }}
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
        disabled={isSearching}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{
                  cursor: isSearching ? "not-allowed" : "pointer",
                  color: "white",
                  animation:
                    searchTerm !== "" &&
                    !hasResults &&
                    !isSearching
                      ? `${growItem} 1s ease infinite`
                      : "none",
                }}
                onClick={onSearch}
              >
                {isSearching ? (
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
  initialQuery = "",
  hasResults,
  isSearching,
  error,
  onSearch,
}: IRequestsMakerProps) {
  // Most people look for a record, not an artist
  const [isArtist, setIsArtist] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(initialQuery);
  const { isMobile } = useDetectMobile();

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
        justifyContent: "center",
        gap: 2,
        width: "100%",
      }}
    >
      <Typography variant="h6" color="white">
        Search and add your favorite albums or artists to your collections.
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Data sourced from Discogs.
      </Typography>
      <SearchTypeSwitch
        isArtist={isArtist}
        onSwitchChange={() => setIsArtist(!isArtist)}
      />
      <SearchInput
        searchTerm={searchTerm}
        setSearchTerm={handleSearchTermChange}
        isArtist={isArtist}
        isMobile={isMobile}
        isSearching={isSearching}
        hasResults={hasResults}
        onSearch={() => onSearch(searchTerm, isArtist)}
        error={error}
      />
    </Box>
  );
}
