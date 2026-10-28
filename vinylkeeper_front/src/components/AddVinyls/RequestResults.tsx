import { Box } from "@mui/material";
import type { DiscogsData, IAlbumRequestResults } from "@models/IRequestProxy";
import ResultArtist from "@components/AddVinyls/ResultArtist";
import CollectionsPagination from "@components/Collections/CollectionsPagination";
import ResultAlbums from "./ResultAlbums";

interface IRequestResultsProps {
  isArtist: boolean;
  items: DiscogsData[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isChangingPage?: boolean;
  onPickPressing?: (album: IAlbumRequestResults) => void;
}

export default function RequestResults({
  isArtist,
  items,
  page,
  totalPages,
  onPageChange,
  isChangingPage = false,
  onPickPressing,
}: IRequestResultsProps) {
  return (
    <Box sx={{ width: "100%", opacity: isChangingPage ? 0.6 : 1, transition: "opacity 0.2s" }}>
      {isArtist ? <ResultArtist data={items} /> : <ResultAlbums data={items} onPickPressing={onPickPressing} />}
      <CollectionsPagination totalPages={totalPages} page={page} onChange={onPageChange} />
    </Box>
  );
}
