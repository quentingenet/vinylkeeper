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
} from "@mui/material";
import { searchProxy } from "@services/RequestProxyService";
import { useState, useEffect } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { growItem } from "@utils/Animations";

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
  const [requestToSend, setRequestToSend] = useState<IRequestToSend>({
    query: "",
    is_artist: true,
  });
  const { isMobile } = useDetectMobile();

  const handleSwitchChange = () => {
    setIsArtist(!isArtist);
  };
  const handleSearch = async () => {
    const response = await searchProxy(requestToSend);
    setRequestResults([
      {
        type: isArtist ? "artist" : "album",
        data: isArtist
          ? (response as IArtistRequestResults[])
          : (response as IAlbumRequestResults[]),
      },
    ]);
  };

  useEffect(() => {
    setRequestToSend({
      query: searchTerm,
      is_artist: isArtist,
    });
  }, [searchTerm, isArtist]);

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
        sx={{
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
        <Switch checked={isArtist} onChange={handleSwitchChange} />
        <Typography sx={{ paddingY: 1 }} variant="h3">
          Artist
        </Typography>
      </Box>
      <TextField
        sx={{ width: isMobile ? "320px" : "400px" }}
        label={`Search by ${isArtist ? "artist" : "album"}`}
        variant="outlined"
        fullWidth
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment
                position="end"
                sx={{
                  cursor: "pointer",
                  color: "white",
                  animation:
                    requestResults.length === 0 || searchTerm === ""
                      ? `${growItem} 1s ease infinite`
                      : "none",
                }}
                onClick={handleSearch}
              >
                <SearchIcon fontSize="large" />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
}
