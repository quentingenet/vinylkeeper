import type { ReactNode } from "react";
import { Avatar, Box, Collapse, ListItemButton, Typography } from "@mui/material";
import { Album as AlbumIcon, Person as PersonIcon } from "@mui/icons-material";
import EditionChips from "@components/AddVinyls/EditionChips";
import type { DiscogsData } from "@models/IRequestProxy";
import { buildProxyImageUrl } from "@utils/ImageProxyHelper";

const THUMBNAIL_SIZE = 64;

interface RecordResultRowProps {
  item: DiscogsData;
  isArtist: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** A compact search result: small cover, title and pressing details, unfolding to its actions. */
export default function RecordResultRow({ item, isArtist, expanded, onToggle, children }: RecordResultRowProps) {
  return (
    <Box component="li" sx={{ listStyle: "none", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
      <ListItemButton onClick={onToggle} selected={expanded} aria-expanded={expanded} sx={{ gap: 2, py: 1 }}>
        <Avatar
          variant="rounded"
          src={item.picture ? buildProxyImageUrl(item.picture, 128, 128, 75, false) : undefined}
          alt=""
          sx={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, bgcolor: "#2a2a2a", color: "primary.main" }}
        >
          {isArtist ? <PersonIcon /> : <AlbumIcon />}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography sx={{ color: "text.primary", fontWeight: 500, mb: isArtist ? 0 : 0.5 }} noWrap>
            {item.title || item.name || "Unknown"}
          </Typography>
          {!isArtist && <EditionChips album={item} centered={false} />}
        </Box>
      </ListItemButton>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
