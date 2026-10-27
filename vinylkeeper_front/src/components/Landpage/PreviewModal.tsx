import { useState } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { ChevronLeft, ChevronRight, Close } from "@mui/icons-material";
import {
  ImageContainer,
  ModalContent,
  ModalImage,
  StyledModal,
  TextContainer,
  modalAccentColor,
  modalTitleSx,
  slideTextSx,
  slideTitleSx,
} from "@components/Modals/carouselModalStyles";
import type { PreviewSlide } from "@components/Landpage/previewSlides";
import { growItem } from "@utils/Animations";

interface PreviewModalProps {
  open: boolean;
  slides: PreviewSlide[];
  onClose: () => void;
  onEnter: () => void;
}

const TITLE_ID = "preview-modal-title";
const SCREENSHOT_ASPECT_RATIO = "16 / 9";

const navButtonSx = {
  color: modalAccentColor,
  "&:not(.Mui-disabled)": { animation: `${growItem} 1s ease infinite` },
  "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
} as const;

export default function PreviewModal({ open, slides, onClose, onEnter }: PreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lastIndex = slides.length - 1;
  const slide = slides[activeIndex];

  const goTo = (index: number) => setActiveIndex(Math.min(Math.max(index, 0), lastIndex));

  const handleClose = () => {
    setActiveIndex(0);
    onClose();
  };

  const handleEnter = () => {
    setActiveIndex(0);
    onEnter();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") goTo(activeIndex - 1);
    if (event.key === "ArrowRight") goTo(activeIndex + 1);
  };

  if (!slide) return null;

  return (
    <StyledModal open={open} onClose={handleClose}>
      <ModalContent
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        sx={{ position: "relative", overflowY: "auto" }}
      >
        <IconButton
          aria-label="Close preview"
          onClick={handleClose}
          sx={{ position: "absolute", top: 8, right: 8, color: "#fffbf9" }}
        >
          <Close />
        </IconButton>

        <Typography
          id={TITLE_ID}
          variant="h4"
          component="h2"
          sx={(theme) => ({
            ...modalTitleSx,
            px: 5,
            fontSize: { xs: theme.typography.h5.fontSize, sm: theme.typography.h4.fontSize },
          })}
        >
          A look inside VinylKeeper
        </Typography>

        <ImageContainer sx={{ height: "auto", aspectRatio: SCREENSHOT_ASPECT_RATIO, flexShrink: 0 }}>
          <ModalImage src={slide.image} alt={slide.title} />
        </ImageContainer>

        <TextContainer>
          <Typography variant="h6" sx={slideTitleSx}>
            {slide.title}
          </Typography>
          <Typography variant="body1" sx={slideTextSx}>
            {slide.description}
          </Typography>
        </TextContainer>

        <Box display="flex" justifyContent="center">
          <Button onClick={handleEnter}>Enter</Button>
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <IconButton
            aria-label="Previous screenshot"
            onClick={() => goTo(activeIndex - 1)}
            disabled={activeIndex === 0}
            sx={navButtonSx}
          >
            <ChevronLeft fontSize="large" />
          </IconButton>
          <Box display="flex" alignItems="center" gap={1}>
            {slides.map((item, index) => (
              <Box
                key={item.title}
                component="button"
                type="button"
                aria-label={`Show screenshot ${index + 1}: ${item.title}`}
                aria-current={index === activeIndex}
                onClick={() => goTo(index)}
                sx={{
                  width: 10,
                  height: 10,
                  p: 0,
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  backgroundColor: index === activeIndex ? modalAccentColor : "rgba(255, 255, 255, 0.3)",
                }}
              />
            ))}
          </Box>
          <IconButton
            aria-label="Next screenshot"
            onClick={() => goTo(activeIndex + 1)}
            disabled={activeIndex === lastIndex}
            sx={navButtonSx}
          >
            <ChevronRight fontSize="large" />
          </IconButton>
        </Box>
      </ModalContent>
    </StyledModal>
  );
}
