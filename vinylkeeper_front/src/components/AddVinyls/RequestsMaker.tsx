import useDetectMobile from "@hooks/useDetectMobile";
import {
  IAlbumRequestResults,
  IArtistRequestResults,
  IRequestResults,
  IRequestToSend,
} from "@models/IRequestProxy";
import { Box, Button, Switch, TextField, Typography } from "@mui/material";
import { searchProxy } from "@services/RequestProxyService";
import { useState, useEffect } from "react";

interface IRequestsMakerProps {
  setRequestResults: (results: IRequestResults[]) => void;
}

export default function RequestsMaker({
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
    console.log(response);
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
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <Typography>Album</Typography>
        <Switch checked={isArtist} onChange={handleSwitchChange} />
        <Typography>Artist</Typography>
      </Box>
      <TextField
        sx={{ width: isMobile ? "320px" : "400px" }}
        label={`Search by ${isArtist ? "artist" : "album"}`}
        variant="outlined"
        fullWidth
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
      />
      <Button
        variant="contained"
        color="warning"
        onClick={handleSearch}
        sx={{ marginY: 1, paddingX: "3%", paddingY: "1%" }}
      >
        Search
      </Button>
    </Box>
  );
}
