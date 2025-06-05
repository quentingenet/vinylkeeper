import useDetectMobile from "@hooks/useDetectMobile";
import { Email, Close as CloseIcon } from "@mui/icons-material";
import {
  Modal,
  TextField,
  InputAdornment,
  Button,
  Collapse,
  Alert,
  IconButton,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { Grid } from "@mui/material";
import { emailValidator } from "@utils/Regex";
import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { userApiService } from "@services/UserApiService";

type ForgotPasswordProps = {
  openForgotPassword: boolean;
  setOpenForgotPassword: (value: boolean) => void;
  setForgotPassword: (value: boolean) => void;
};

export default function ForgotPasswordModal({
  openForgotPassword,
  setOpenForgotPassword,
  setForgotPassword,
}: ForgotPasswordProps) {
  const [isMailSended, setIsMailSended] = useState(false);
  const [errorRecovery, setErrorRecovery] = useState(false);
  const [emailRecovery, setEmailRecovery] = useState("");
  const { isMobile } = useDetectMobile();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const handleCloseForgotPassword = () => {
    setOpenForgotPassword(false);
    setForgotPassword(false);
  };

  const handlePasswordRecovery = async () => {
    if (emailRecovery.match(emailValidator)) {
      try {
        await userApiService.forgotPassword(emailRecovery.toLowerCase());
        setIsMailSended(true);
        setErrorRecovery(false);
      } catch {
        setErrorRecovery(true);
        setIsMailSended(false);
      }
    } else {
      setErrorRecovery(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.match(emailValidator)) {
      try {
        setIsLoading(true);
        await userApiService.forgotPassword(email.toLowerCase());
        setIsMailSended(true);
        setErrorRecovery(false);
        setMessage("Mail sent. Check your inbox.");
        setMessageType("success");
      } catch (error) {
        setErrorRecovery(true);
        setIsMailSended(false);
        setMessage("Error, email not sent");
        setMessageType("error");
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrorRecovery(true);
      setEmailError("Invalid email format");
    }
  };

  return (
    <Modal
      open={openForgotPassword}
      onClose={handleCloseForgotPassword}
      sx={{
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        margin: "auto",
        border: "none",
        height: isMobile ? "100dvh" : "100vh",
      }}
    >
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{
          bgcolor: "#fffbf9",
          borderRadius: "5px",
          width: isMobile ? "90dvw" : "24vw",
          minWidth: isMobile ? "280px" : 350,
          maxWidth: isMobile ? "400px" : 460,
          maxHeight: isMobile ? "80dvh" : "90vh",
          overflowY: "auto",
          boxShadow: 6,
          mt: isMobile ? "10dvh" : 0,
          mb: isMobile ? "5dvh" : 0,
          p: isMobile ? 2 : 4,
        }}
      >
        <Box sx={{ width: "100%" }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!emailError}
            helperText={emailError}
            sx={{ mb: 2 }}
            InputProps={{
              style: { textTransform: "lowercase" },
            }}
          />

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!email || isLoading}
              sx={{ mb: 2 }}
            >
              {isLoading ? <CircularProgress size={24} /> : "Send Reset Link"}
            </Button>

            <Button
              variant="text"
              onClick={handleCloseForgotPassword}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </Box>

          {message && (
            <Alert severity={messageType} sx={{ mt: 3 }}>
              {message}
            </Alert>
          )}
        </Box>
      </Grid>
    </Modal>
  );
}
