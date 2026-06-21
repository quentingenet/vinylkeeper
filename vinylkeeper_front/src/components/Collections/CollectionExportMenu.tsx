import { logger } from "@utils/logger";
import { useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  ListItemText,
  Typography,
  Box,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import VinylSpinner from "@components/UI/VinylSpinner";
import { collectionApiService } from "@services/CollectionApiService";
import { triggerBrowserDownload } from "@utils/DownloadUtils";

interface CollectionExportMenuProps {
  collectionId: number;
}

export default function CollectionExportMenu({ collectionId }: CollectionExportMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeExportKey, setActiveExportKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const finishExport = () => {
    window.setTimeout(() => {
      setIsExporting(false);
      setActiveExportKey(null);
    }, 1200);
  };

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setActiveExportKey(null);
    setIsExporting(false);
  };

  const handleExport = async (exportKey: string, pathSuffix: string, fallbackFilename: string) => {
    setActiveExportKey(exportKey);
    setIsExporting(true);
    setAnchorEl(null);
    try {
      const { blob, filename } = await collectionApiService.exportCollectionFile(collectionId, pathSuffix);
      triggerBrowserDownload(blob, filename || fallbackFilename);
    } catch (err) {
      logger.error("Export failed:", err);
    } finally {
      finishExport();
    }
  };

  const handleExportWishlist = async (exportKey: string, format: "csv" | "ods") => {
    setActiveExportKey(exportKey);
    setIsExporting(true);
    setAnchorEl(null);
    try {
      const { blob, filename } = await collectionApiService.exportMyWishlistFile(format);
      triggerBrowserDownload(blob, filename || `wishlist.${format}`);
    } catch (err) {
      logger.error("Wishlist export failed:", err);
    } finally {
      finishExport();
    }
  };

  const exportItems = [
    {
      key: "collection_albums_csv",
      label: "Collection albums (CSV)",
      action: () => handleExport("collection_albums_csv", "albums.csv", `collection_${collectionId}_albums.csv`),
    },
    {
      key: "collection_albums_ods",
      label: "Collection albums (ODS)",
      action: () => handleExport("collection_albums_ods", "albums.ods", `collection_${collectionId}_albums.ods`),
    },
    {
      key: "collection_artists_csv",
      label: "Collection artists (CSV)",
      action: () => handleExport("collection_artists_csv", "artists.csv", `collection_${collectionId}_artists.csv`),
    },
    {
      key: "collection_artists_ods",
      label: "Collection artists (ODS)",
      action: () => handleExport("collection_artists_ods", "artists.ods", `collection_${collectionId}_artists.ods`),
    },
    {
      key: "wishlist_csv",
      label: "My wishlist (CSV)",
      action: () => handleExportWishlist("wishlist_csv", "csv"),
    },
    {
      key: "wishlist_ods",
      label: "My wishlist (ODS)",
      action: () => handleExportWishlist("wishlist_ods", "ods"),
    },
  ];

  return (
    <>
      <Button
        variant="text"
        size="small"
        onClick={handleOpen}
        startIcon={<FileDownloadIcon fontSize="small" />}
        disabled={isExporting}
        sx={{
          minHeight: 30,
          paddingY: 0.25,
          paddingX: 1,
          lineHeight: 1.2,
          textTransform: "none",
        }}
      >
        Export to
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        MenuListProps={{ dense: true }}
        slotProps={{
          paper: {
            sx: {
              "& .MuiMenuItem-root": { py: 0.25, minHeight: 32 },
              "& .MuiTypography-root": { fontSize: "0.95rem" },
            },
          },
        }}
      >
        {exportItems.map(({ key, label, action }) => (
          <MenuItem key={key} onClick={() => void action()}>
            {isExporting && activeExportKey === key ? (
              <Box display="flex" alignItems="center" gap={1}>
                <VinylSpinner size={18} />
                <Typography variant="caption">Exporting…</Typography>
              </Box>
            ) : (
              <ListItemText primary={label} primaryTypographyProps={{ variant: "caption" }} />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
