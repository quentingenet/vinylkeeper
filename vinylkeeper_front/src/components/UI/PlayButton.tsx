import { Box, IconButton } from "@mui/material";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { zoomIn } from "@utils/Animations";

interface PlayButtonProps {
  onClick: (e: React.MouseEvent) => void;
  size?: "small" | "medium" | "large";
  position?: {
    top?: number | string;
    right?: number | string;
    bottom?: number | string;
    left?: number | string;
  };
}

export default function PlayButton({
  onClick,
  size = "small",
  position = { top: 10, right: 50 },
}: PlayButtonProps) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "absolute",
        cursor: "pointer",
        backgroundColor: "#1F1F1F",
        borderRadius: "50%",
        padding: size === "large" ? 1.5 : size === "medium" ? 1.2 : 1,
        ...position,
        opacity: 0.9,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2,
        "&:hover": {
          animation: `${zoomIn} 0.3s ease-in-out`,
          backgroundColor: "#C9A726",
        },
        transition: "background-color 0.2s ease-in-out",
      }}
    >
      <MusicNoteIcon
        fontSize={size}
        sx={{
          color: "#C9A726",
          "&:hover": {
            color: "#1F1F1F",
          },
        }}
      />
    </Box>
  );
}
