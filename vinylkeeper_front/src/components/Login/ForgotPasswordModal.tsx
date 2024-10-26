import useDetectMobile from "@hooks/useDetectMobile";
import { Email } from "@mui/icons-material";
import CloseIcon from "@mui/icons-material/Close";
import {
  Modal,
  Grid,
  TextField,
  InputAdornment,
  Button,
  Collapse,
  Alert,
  IconButton,
  Typography,
} from "@mui/material";
import { emailValidator } from "@utils/Regex";
import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { forgotPasswordService } from "@services/UserService";

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

  const [isMailSended, setIsMailSended] = useState<boolean>(false);
  const [errorRecovery, setErrorRecovery] = useState<boolean>(false);
  const [emailRecovery, setEmailrecovery] = useState<string>("");

  const { isMobile } = useDetectMobile();

  const styleForgotPassword = {
    position: "relative",
    margin: "auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    width: isMobile ? "80%" : "20%",
    bgcolor: "#fffbf9",
    border: "none",
    borderRadius: "5px",
    opacity: 0.7,
  };

  return (
    <>
      <Modal
        open={openForgotPassword}
        onClose={handleCloseForgotPassword}
        aria-labelledby="child-modal-title"
        aria-describedby="child-modal-description"
        sx={styleForgotPassword}
      >
        <Grid container className={styles.formContainer}>
          <Grid container className={styles.globalForm}>
            <Grid item>
              <Typography variant={"subtitle2"} color={"black"}>
                Enter the email you used to register
              </Typography>
            </Grid>
            <Grid item>
              <TextField
                id="emailRecovery"
                label="Send recovery email to..."
                type="email"
                variant="outlined"
                onChange={(event) => setEmailrecovery(event.target.value)}
                value={emailRecovery}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Grid container flexDirection={"row"} justifyContent={"center"}>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => {
                  if (emailRecovery.match(emailValidator)) {
                    forgotPasswordService(emailRecovery);
                    setIsMailSended(true);
                    setErrorRecovery(false);
                  } else {
                    setErrorRecovery(true);
                  }
                }}
              >
                Send
              </Button>
            </Grid>
          </Grid>
          {errorRecovery && (
            <Grid container justifyContent={"center"}>
              <Grid item>
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
              </Grid>
            </Grid>
          )}
          {isMailSended && (
            <Grid container justifyContent={"center"}>
              <Grid item>
                <Collapse in={isMailSended}>
                  <Alert
                    action={
                      <IconButton
                        aria-labautoel="close"
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
              </Grid>
            </Grid>
          )}
        </Grid>
      </Modal>
    </>
  );
}
