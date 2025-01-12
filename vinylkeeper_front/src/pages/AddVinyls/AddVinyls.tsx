import { useState } from "react";
import { Box, Switch, TextField, Typography, Button } from "@mui/material";
import useDetectMobile from "@hooks/useDetectMobile";
import { API_DEEZER_URL } from "@utils/GlobalUtils";

export default function AddVinyls() {
  const [isArtist, setIsArtist] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { isMobile } = useDetectMobile();

  const handleSwitchChange = () => {
    setIsArtist(!isArtist);
  };

  const handleSearch = async () => {
    const response = await fetch(
      `${API_DEEZER_URL}${isArtist ? "artist" : "album"}?q=${searchTerm}`
    );
    const data = await response.json();
    console.log(data);
  };

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
        sx={{ width: isMobile ? "320px" : "500px" }}
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
