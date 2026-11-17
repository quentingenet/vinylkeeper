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
import { deliverFile } from "@utils/DownloadUtils";
import useDetectMobile from "@hooks/useDetectMobile";
import {
  collectionActionButtonSx,
  collectionMenuPaperSx,
  desktopMenuTextSx,
} from "@components/Collections/collectionMenuStyles";
import { useTranslation } from "react-i18next";

// Desktop: the size of the texts around the menu ("Created on", the buttons), in the font
// of the buttons. The desktop theme sizes every ListItemText for the navigation bar (1.6rem).
interface CollectionExportMenuProps {
  collectionId: number;
}

export default function CollectionExportMenu({ collectionId }: CollectionExportMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { t } = useTranslation("collections");
  const [activeExportKey, setActiveExportKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { isMobile } = useDetectMobile();

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
      await deliverFile(blob, filename || fallbackFilename);
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
      await deliverFile(blob, filename || `wishlist.${format}`);
    } catch (err) {
      logger.error("Wishlist export failed:", err);
    } finally {
      finishExport();
    }
  };

  const exportItems = [
    {
      key: "collection_albums_csv",
      label: t("export.albumsCsv"),
      action: () => handleExport("collection_albums_csv", "albums.csv", `collection_${collectionId}_albums.csv`),
    },
    {
      key: "collection_albums_ods",
      label: t("export.albumsOds"),
      action: () => handleExport("collection_albums_ods", "albums.ods", `collection_${collectionId}_albums.ods`),
    },
    {
      key: "collection_artists_csv",
      label: t("export.artistsCsv"),
      action: () => handleExport("collection_artists_csv", "artists.csv", `collection_${collectionId}_artists.csv`),
    },
    {
      key: "collection_artists_ods",
      label: t("export.artistsOds"),
      action: () => handleExport("collection_artists_ods", "artists.ods", `collection_${collectionId}_artists.ods`),
    },
    {
      key: "wishlist_csv",
      label: t("export.wishlistCsv"),
      action: () => handleExportWishlist("wishlist_csv", "csv"),
    },
    {
      key: "wishlist_ods",
      label: t("export.wishlistOds"),
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
        sx={collectionActionButtonSx}
      >
        {t("export.button")}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: collectionMenuPaperSx(isMobile),
          },
          list: { dense: true },
        }}
      >
        {exportItems.map(({ key, label, action }) => (
          <MenuItem key={key} onClick={() => void action()}>
            {isExporting && activeExportKey === key ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <VinylSpinner size={18} />
                <Typography variant="caption">{t("export.exporting")}</Typography>
              </Box>
            ) : (
              <ListItemText
                primary={label}
                // On the component itself: wins over the ListItemText size of the theme
                sx={isMobile ? undefined : { "& .MuiListItemText-primary": desktopMenuTextSx }}
                slotProps={{
                  primary: { variant: "caption" },
                }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
