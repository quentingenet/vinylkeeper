import React from "react";
import { Modal, Box, Typography, Button, Fade, Stack } from "@mui/material";
import useDetectMobile from "@hooks/useDetectMobile";
import founderImg from "@assets/quentin_genet_vinyl_keeper.webp";

interface ModalFounderVinylKeeperProps {
  openFounderModal: boolean;
  setOpenFounderModal: (value: boolean) => void;
}

const ModalFounderVinylKeeper: React.FC<ModalFounderVinylKeeperProps> = ({
  openFounderModal,
  setOpenFounderModal,
}) => {
  const { isMobile } = useDetectMobile();

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
      <Fade in={openFounderModal} timeout={400}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "#2c2c2e",
            color: "#e4e4e4",
            borderRadius: 2,
            boxShadow: 24,
            p: isMobile ? 2 : 4,
            minWidth: isMobile ? "320px" : "620px",
            maxWidth: isMobile ? "340px" : "620px",
            textAlign: "center",
            marginY: isMobile ? 2 : 4,
          }}
        >
          <Stack direction="column" justifyContent="center" alignItems="center">
            <img
              src={founderImg}
              alt="Quentin Genet, founder of Vinyl Keeper"
              style={{
                width: isMobile ? "320px" : "600px",
                borderRadius: "5px",
                marginBottom: 16,
              }}
            />
            <Typography
              id="founder-modal-title"
              variant="h5"
              sx={{
                fontWeight: "bold",
                mb: 2,
                fontSize: isMobile ? "1.4rem" : "1.7rem",
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
                fontSize: isMobile ? "1.3rem" : "1.6rem",
                minWidth: "300px",
                maxWidth: "500px",
                textAlign: "justify",
              }}
            >
              Passionate about music and vinyl records, I created Vinyl
              Keeper,&nbsp;a free and open-source app to provide all collectors
              with a modern, simple, and community-driven tool to manage, share,
              and discover vinyl collections. Thank you for using the app and
              keeping the passion for&nbsp;records&nbsp;alive&nbsp;!
            </Typography>
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#C9A726",
                color: "#1F1F1F",
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
    </Modal>
  );
};

export default ModalFounderVinylKeeper;
