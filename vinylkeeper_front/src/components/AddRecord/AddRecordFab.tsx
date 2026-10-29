import { Fab, Tooltip } from "@mui/material";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import { useLocation } from "react-router-dom";
import { useAddRecord } from "@contexts/AddRecordContext";
import useDetectMobile from "@hooks/useDetectMobile";
import { EGlobalUrls } from "@utils/GlobalUrls";
import { growItem } from "@utils/Animations";
import { colors } from "@styles/colors";

// Pages with their own floating add button, which this one must not compete with
const PAGES_WITH_THEIR_OWN_ADD_BUTTON: string[] = [EGlobalUrls.ATLAS];

/** "Add a record" from any page; labelled, so it never reads like the other "+" buttons of the app. */
export default function AddRecordFab() {
  const { openAddRecord, isAddRecordOpen } = useAddRecord();
  const { pathname } = useLocation();
  const { isMobile } = useDetectMobile();

  if (isAddRecordOpen || PAGES_WITH_THEIR_OWN_ADD_BUTTON.includes(pathname)) return null;

  return (
    <Tooltip title={isMobile ? "Add a record" : ""} placement="left">
      <Fab
        color="primary"
        variant={isMobile ? "circular" : "extended"}
        aria-label="Add a record"
        onClick={() => openAddRecord()}
        sx={{
          position: "fixed",
          right: { xs: 16, md: 32 },
          bottom: { xs: 16, md: 32 },
          gap: 1,
          backgroundColor: "primary.main",
          color: colors.deep,
          fontWeight: "bold",
          "&:hover": { backgroundColor: colors.goldDark },
          // Same pulse as the "Add a spot" button of the Atlas map
          animation: `${growItem} 1.3s infinite`,
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
        }}
      >
        <LibraryAddIcon />
        {!isMobile && "Add a record"}
      </Fab>
    </Tooltip>
  );
}
