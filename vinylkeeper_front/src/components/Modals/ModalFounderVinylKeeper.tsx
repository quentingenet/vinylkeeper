import React, { useEffect, useState } from "react";
import { Modal, Box, Typography, Button, Fade, Stack, keyframes } from "@mui/material";
import useDetectMobile from "@hooks/useDetectMobile";
import VinylSpinner from "@components/UI/VinylSpinner";
import founderImg from "@assets/quentin_genet_vinyl_keeper.webp";
import { colors } from "@styles/colors";

// Size of the photo file: its place is kept before it is drawn, so nothing moves when it appears
const PHOTO_WIDTH = 593;
const PHOTO_HEIGHT = 335;

// The photo shows up softly, just after the popup itself
const photoFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

interface ModalFounderVinylKeeperProps {
  openFounderModal: boolean;
  setOpenFounderModal: (value: boolean) => void;
}

const ModalFounderVinylKeeper: React.FC<ModalFounderVinylKeeperProps> = ({
  openFounderModal,
  setOpenFounderModal,
}) => {
  const { isMobile } = useDetectMobile();
  const [imageReady, setImageReady] = useState(false);

  // Loaded and decoded as soon as the footer shows, before anyone opens the popup: by then
  // the photo is usually ready, and the popup appears whole instead of growing when it lands
  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.src = founderImg;
    const ready = () => {
      if (!cancelled) setImageReady(true);
    };
    // A failed load still opens the popup, without its photo rather than never.
    // Browsers without decode() (and the test DOM) open it at once.
    if (typeof image.decode === "function") image.decode().then(ready, ready);
    else ready();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Modal
      open={openFounderModal}
      onClose={() => setOpenFounderModal(false)}
      closeAfterTransition
      aria-labelledby="founder-modal-title"
      aria-describedby="founder-modal-description"
      disableAutoFocus
      disableEnforceFocus
    >
      {!imageReady ? (
        <Box
          role="status"
          aria-label="Loading"
          sx={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <VinylSpinner size={64} />
        </Box>
      ) : (
        <Fade in={openFounderModal} timeout={400}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: colors.paper,
              color: colors.textMuted,
              borderRadius: 2,
              boxShadow: 24,
              p: isMobile ? 2 : 4,
              // Whatever the phone: 16px from each edge, and scrollable if the screen is short
              width: isMobile ? "calc(100vw - 32px)" : "620px",
              maxWidth: "620px",
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              boxSizing: "border-box",
              textAlign: "center",
            }}
          >
            <Stack direction="column" justifyContent="center" alignItems="center">
              <Box
                component="img"
                src={founderImg}
                alt="Quentin Genet, founder of Vinyl Keeper"
                width={PHOTO_WIDTH}
                height={PHOTO_HEIGHT}
                sx={{
                  width: "100%",
                  maxWidth: `${PHOTO_WIDTH}px`,
                  height: "auto",
                  aspectRatio: `${PHOTO_WIDTH} / ${PHOTO_HEIGHT}`,
                  borderRadius: "5px",
                  mb: 2,
                  opacity: 0,
                  animation: `${photoFadeIn} 0.8s ease-out 0.15s forwards`,
                  "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 1 },
                }}
              />
              <Typography
                id="founder-modal-title"
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  mb: 2,
                  fontSize: isMobile ? "1.3rem" : "1.7rem",
                  fontFamily: "Oswald-ExtraLight, sans-serif",
                }}
              >
                When music and code spin together,&nbsp;
                {isMobile && <br />}
                cool&nbsp;happens...
              </Typography>
              <Typography
                id="founder-modal-description"
                variant="h6"
                sx={{
                  mb: 3,
                  fontFamily: "Oswald-ExtraLight, sans-serif",
                  fontSize: isMobile ? "1.15rem" : "1.6rem",
                  maxWidth: "500px",
                  // Justified text leaves wide gaps on a narrow screen
                  textAlign: isMobile ? "left" : "justify",
                }}
              >
                Passionate about music and vinyl, I built Vinyl Keeper: a free,
                open-source app to manage your records, share your collections with
                the community, and discover the best vinyl spots around the world
                on the Vinyl Atlas. Thank you for using it, and for keeping the
                passion for&nbsp;vinyl&nbsp;alive!
              </Typography>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "primary.main",
                  color: colors.deep,
                  fontWeight: "bold",
                  fontFamily: "Oswald-ExtraLight, sans-serif",
                }}
                onClick={() => setOpenFounderModal(false)}
              >
                Close
              </Button>
            </Stack>
          </Box>
        </Fade>
      )}
    </Modal>
  );
};

export default ModalFounderVinylKeeper;
