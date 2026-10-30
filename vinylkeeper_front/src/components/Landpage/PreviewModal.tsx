import { useState } from "react";
import { Box, Button, IconButton, Typography, keyframes } from "@mui/material";
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
import { usePreloadedImages } from "@hooks/usePreloadedImages";
import VinylSpinner from "@components/UI/VinylSpinner";
import { colors } from "@styles/colors";

interface PreviewModalProps {
  open: boolean;
  slides: PreviewSlide[];
  onClose: () => void;
  onEnter: () => void;
  /** Load the screenshots before the tour opens, for instance as soon as the join popup shows */
  preload?: boolean;
}

// Each screenshot shows up softly, at opening and at every slide change
const screenshotFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// Visible title is the brand only; screen readers get the full purpose
const DIALOG_LABEL = "A look inside VinylKeeper";
const SCREENSHOT_ASPECT_RATIO = "16 / 9";

const navButtonSx = {
  color: modalAccentColor,
  "&:not(.Mui-disabled)": { animation: `${growItem} 1s ease infinite` },
  "&.Mui-disabled": { color: "rgba(255, 255, 255, 0.3)" },
} as const;

export default function PreviewModal({ open, slides, onClose, onEnter, preload = false }: PreviewModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Every screenshot at once: the tour opens whole, and changing slides never waits for an image
  const screenshotsReady = usePreloadedImages(slides.map((item) => item.image), open || preload);
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
      {!screenshotsReady ? (
        <Box
          role="status"
          aria-label="Loading"
          sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <VinylSpinner size={64} />
        </Box>
      ) : (
      <ModalContent
        role="dialog"
        aria-modal="true"
        aria-label={DIALOG_LABEL}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        sx={{ position: "relative", overflowY: "auto" }}
      >
        <IconButton
          aria-label="Close preview"
          onClick={handleClose}
          sx={{ position: "absolute", top: 8, right: 8, color: colors.textLight }}
        >
          <Close />
        </IconButton>

        <Typography
          variant="h4"
          component="h2"
          aria-hidden="true"
          sx={(theme) => ({
            ...modalTitleSx,
            px: 5,
            fontFamily: "RockSalt",
            marginBottom: 3,
            fontSize: { xs: theme.typography.h5.fontSize, sm: theme.typography.h4.fontSize },
          })}
        >
          Vinyl Keeper
        </Typography>

        <ImageContainer sx={{ height: "auto", aspectRatio: SCREENSHOT_ASPECT_RATIO, flexShrink: 0 }}>
          <ModalImage
            key={slide.image}
            src={slide.image}
            alt={slide.title}
            sx={{
              animation: `${screenshotFadeIn} 0.4s ease-out`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          />
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
      )}
    </StyledModal>
  );
}
