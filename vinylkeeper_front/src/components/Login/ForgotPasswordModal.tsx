import useDetectMobile from "@hooks/useDetectMobile";
import { Email, Close as CloseIcon } from "@mui/icons-material";
import {
  Modal,
  Grid2,
  TextField,
  InputAdornment,
  Button,
  Collapse,
  Alert,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import { emailValidator } from "@utils/Regex";
import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { userApiService } from "@services/UserApiService";

type ForgotPasswordProps = {
  openForgotPassword: boolean;
  setOpenForgotPassword: (value: boolean) => void;
  setForgotPassword(value: boolean): void;
};

export default function ForgotPasswordModal(props: ForgotPasswordProps) {
  const { setForgotPassword, openForgotPassword, setOpenForgotPassword } =
    props;

  const handleCloseForgotPassword = () => {
    setOpenForgotPassword(false);
    setForgotPassword(false);
  };

  const [isMailSended, setIsMailSended] = useState(false);
  const [errorRecovery, setErrorRecovery] = useState(false);
  const [emailRecovery, setEmailrecovery] = useState("");

  const { isMobile } = useDetectMobile();

  const handlePasswordRecovery = async () => {
    if (emailRecovery.match(emailValidator)) {
      try {
        await userApiService.forgotPassword(emailRecovery.toLowerCase());
        setIsMailSended(true);
        setErrorRecovery(false);
      } catch (error: any) {
        setErrorRecovery(true);
        setIsMailSended(false);
      }
    } else {
      setErrorRecovery(true);
    }
  };

  return (
    <Modal
      open={openForgotPassword}
      onClose={handleCloseForgotPassword}
      aria-labelledby="child-modal-title"
      aria-describedby="child-modal-description"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "#fffbf9",
          borderRadius: "5px",
          width: isMobile ? "80%" : "20%",
          p: 4,
        }}
      >
        <Grid2 container className={styles.formContainer} spacing={2}>
          <Grid2 sx={{ width: "100%", textAlign: "center" }}>
            <Typography variant="subtitle2" color="black">
              Enter the email you used to register
            </Typography>
          </Grid2>
          <Grid2 sx={{ width: "100%" }}>
            <TextField
              fullWidth
              id="emailRecovery"
              label="Send recovery email to..."
              type="email"
              variant="outlined"
              onChange={(event) => setEmailrecovery(event.target.value)}
              value={emailRecovery}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Email />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 sx={{ width: "100%", textAlign: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handlePasswordRecovery}
            >
              Send
            </Button>
          </Grid2>
          <Grid2 sx={{ width: "100%", textAlign: "center" }}>
            <Collapse in={errorRecovery}>
              <Alert
                severity="error"
                action={
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setErrorRecovery(false);
                      setOpenForgotPassword(false);
                      setForgotPassword(false);
                    }}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                }
              >
                Error, email not sent
              </Alert>
            </Collapse>
          </Grid2>
          <Grid2 sx={{ width: "100%", textAlign: "center" }}>
            <Collapse in={isMailSended}>
              <Alert
                action={
                  <IconButton
                    aria-label="close"
                    color="inherit"
                    size="small"
                    onClick={() => {
                      setIsMailSended(false);
                      setForgotPassword(false);
                    }}
                  >
                    <CloseIcon fontSize="inherit" />
                  </IconButton>
                }
              >
                Mail sent.
              </Alert>
            </Collapse>
          </Grid2>
        </Grid2>
      </Box>
    </Modal>
  );
}
