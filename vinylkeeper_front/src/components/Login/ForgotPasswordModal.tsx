import useDetectMobile from "@hooks/useDetectMobile";
import {
  Modal,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
} from "@mui/material";
import { Grid } from "@mui/material";
import { emailValidator } from "@utils/Regex";
import { useState } from "react";
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

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (email.match(emailValidator)) {
      try {
        setIsLoading(true);
        await userApiService.forgotPassword(email.toLowerCase());
        setMessage("Mail sent. Check your inbox.");
        setMessageType("success");
      } catch {
        setMessage("Error, email not sent");
        setMessageType("error");
      } finally {
        setIsLoading(false);
      }
    } else {
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
              onClick={(e) => { void handleSubmit(e); }}
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
