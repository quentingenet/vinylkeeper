import { Box, Modal } from "@mui/material";
import { styled } from "@mui/material/styles";

export const modalAccentColor = "#C9A726";

export const StyledModal = styled(Modal)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2),
}));

export const ModalContent = styled(Box)(({ theme }) => ({
  backgroundColor: "#2c2c2e",
  borderRadius: "8px",
  boxShadow: "0 0 20px rgba(201, 167, 38, 0.3)",
  padding: theme.spacing(3),
  maxWidth: "600px",
  width: "100%",
  maxHeight: "90vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
}));

export const ImageContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  height: "300px",
  borderRadius: "8px",
  overflow: "hidden",
  marginBottom: theme.spacing(2),
  border: `1px solid ${modalAccentColor}`,
  position: "relative",
}));

export const ModalImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "opacity 0.5s ease-in-out",
});

export const TextContainer = styled(Box)(({ theme }) => ({
  backgroundColor: "#3f3f41",
  padding: theme.spacing(2),
  borderRadius: "6px",
  border: `1px solid ${modalAccentColor}`,
  marginBottom: theme.spacing(2),
}));

export const modalTitleSx = {
  color: modalAccentColor,
  textAlign: "center",
  marginBottom: 2,
  fontFamily: "Oswald, sans-serif",
  textShadow: "2px 2px 4px rgba(0,0,0,0.7)",
} as const;

export const slideTitleSx = {
  color: modalAccentColor,
  marginBottom: 1,
  fontFamily: "Oswald, sans-serif",
} as const;

export const slideTextSx = {
  color: "#fffbf9",
  lineHeight: 1.6,
} as const;
