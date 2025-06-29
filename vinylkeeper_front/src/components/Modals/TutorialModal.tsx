import React, { useState, useEffect } from "react";
import {
  Box,
  Modal,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
  Fade,
} from "@mui/material";
import { styled } from "@mui/material/styles";

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
}

const StyledModal = styled(Modal)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(2),
}));

const ModalContent = styled(Box)(({ theme }) => ({
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

const ImageContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  height: "300px",
  borderRadius: "8px",
  overflow: "hidden",
  marginBottom: theme.spacing(2),
  border: "1px solid #C9A726",
  position: "relative",
}));

const TutorialImage = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  transition: "opacity 0.5s ease-in-out",
});

const TextContainer = styled(Box)(({ theme }) => ({
  backgroundColor: "#3f3f41",
  padding: theme.spacing(2),
  borderRadius: "6px",
  border: "1px solid #C9A726",
  marginBottom: theme.spacing(2),
}));

const steps = [
  {
    title: "Add Vinyls",
    content:
      "After searching for an album or artist, you can select a collection and add your discoveries!",
    image: "/vk_tutorial/1_add_vinyl.jpg",
  },
  {
    title: "Collections",
    content:
      "You can like collections and choose to make your collections public to share their content with other users. Simply switch between private and public! If a collection is public, all users can explore it and like it.",
    image: "/vk_tutorial/2_collection.jpg",
  },
  {
    title: "Places",
    content:
      "Share and discover with the vinyl culture community: shops, flea markets...",
    images: ["/vk_tutorial/3_places.jpg", "/vk_tutorial/4_suggest_places.jpg"],
  },
];

export default function TutorialModal({ open, onClose }: TutorialModalProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (activeStep === 2) {
      const interval = setInterval(() => {
        setImageIndex((prev) => (prev === 0 ? 1 : 0));
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setImageIndex(0);
    }
  }, [activeStep]);

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  const handleClose = () => {
    setActiveStep(0);
    setImageIndex(0);
    onClose();
  };

  const progress = ((activeStep + 1) / steps.length) * 100;

  return (
    <StyledModal open={open} onClose={handleClose}>
      <ModalContent>
        <Typography
          variant="h4"
          component="h2"
          sx={{
            color: "#C9A726",
            textAlign: "center",
            marginBottom: 2,
            fontFamily: "Oswald, sans-serif",
            textShadow: "2px 2px 4px rgba(0,0,0,0.7)",
          }}
        >
          Welcome to VinylKeeper
        </Typography>

        <Stepper
          activeStep={activeStep}
          sx={{
            marginBottom: 2,
            "& .MuiStepLabel-root .Mui-completed": {
              color: "#C9A726",
            },
            "& .MuiStepLabel-root .Mui-active": {
              color: "#C9A726",
            },
            "& .MuiStepLabel-label": {
              color: "#fffbf9",
            },
          }}
        >
          {steps.map((step, index) => (
            <Step key={index}>
              <StepLabel>{step.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: "#3f3f41",
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#C9A726",
            },
            marginBottom: 2,
          }}
        />

        <ImageContainer>
          {activeStep === 2 ? (
            <Fade in={imageIndex === 0} timeout={500}>
              <TutorialImage
                src={steps[2].images![imageIndex]}
                alt={steps[2].title}
                style={{ display: imageIndex === 0 ? "block" : "none" }}
              />
            </Fade>
          ) : (
            <TutorialImage
              src={steps[activeStep].image}
              alt={steps[activeStep].title}
            />
          )}
          {activeStep === 2 && (
            <Fade in={imageIndex === 1} timeout={500}>
              <TutorialImage
                src={steps[2].images![imageIndex]}
                alt={steps[2].title}
                style={{
                  display: imageIndex === 1 ? "block" : "none",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              />
            </Fade>
          )}
        </ImageContainer>

        <TextContainer>
          <Typography
            variant="h6"
            sx={{
              color: "#C9A726",
              marginBottom: 1,
              fontFamily: "Oswald, sans-serif",
            }}
          >
            {steps[activeStep].title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "#fffbf9",
              lineHeight: 1.6,
            }}
          >
            {steps[activeStep].content}
          </Typography>
        </TextContainer>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
          }}
        >
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            sx={{
              color: "#C9A726",
              borderColor: "#C9A726",
              "&:hover": {
                borderColor: "#fffbf9",
                color: "#fffbf9",
              },
            }}
            variant="outlined"
          >
            Back
          </Button>

          <Box sx={{ display: "flex", gap: 1 }}>
            {activeStep === steps.length - 1 ? (
              <Button
                onClick={handleClose}
                sx={{
                  backgroundColor: "#C9A726",
                  color: "#2c2c2e",
                  "&:hover": {
                    backgroundColor: "#fffbf9",
                  },
                }}
                variant="contained"
              >
                Get Started
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                sx={{
                  backgroundColor: "#C9A726",
                  color: "#2c2c2e",
                  "&:hover": {
                    backgroundColor: "#fffbf9",
                  },
                }}
                variant="contained"
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </ModalContent>
    </StyledModal>
  );
}
