import useDetectMobile from "@hooks/useDetectMobile";
import {
  Modal,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Grid } from "@mui/material";
import { emailValidator } from "@utils/Regex";
import { useState } from "react";
import { userApiService } from "@services/UserApiService";
import { colors } from "@styles/colors";

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
        // Same answer whether the account exists or not: nobody can test who has an account
        setMessage(
          "If an account exists with this email, a link to choose a new password has been sent. Check your inbox and your spam folder."
        );
        setMessageType("success");
      } catch (error: unknown) {
        setMessage(error instanceof Error ? error.message : "The link could not be sent. Try again in a moment.");
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
      aria-labelledby="forgot-password-title"
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
          bgcolor: colors.textLight,
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
          // The fonts of the home page, which opens this popup
          "& .MuiTypography-root, & .MuiInputBase-root, & .MuiFormLabel-root, & .MuiFormHelperText-root, & .MuiAlert-message": {
            fontFamily: "Oswald-Light, sans-serif",
          },
          "& .MuiButton-root": { fontFamily: "Oswald-Regular, sans-serif" },
        }}
      >
        <Box sx={{ width: "100%" }}>
          <Typography
            id="forgot-password-title"
            variant="h6"
            component="h2"
            sx={{ color: "common.black", textAlign: "center", mb: 1, "&.MuiTypography-root": { fontFamily: "Oswald-Medium, sans-serif" } }}
          >
            Forgot your password?
          </Typography>
          <Typography variant="body2" sx={{ color: "common.black", textAlign: "center", mb: 2.5 }}>
            Enter the email of your account: we send you a link to choose a new password.
          </Typography>
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
            {/* The buttons of the home page theme are grey at 60% opacity: readable ones on this white popup */}
            <Button
              variant="contained"
              onClick={(e) => { void handleSubmit(e); }}
              disabled={!email || isLoading}
              sx={{ mb: 1, mx: 0, opacity: 1, "&.Mui-disabled": { opacity: 0.5 } }}
            >
              {isLoading ? <CircularProgress size={24} /> : "Send Reset Link"}
            </Button>

            <Button
              variant="text"
              onClick={handleCloseForgotPassword}
              disabled={isLoading}
              sx={{
                mx: 0,
                opacity: 1,
                color: "common.black",
                backgroundColor: "transparent",
                border: "none",
                boxShadow: "none",
                textShadow: "none",
                "&:hover": { backgroundColor: "action.hover", color: "common.black", border: "none" },
              }}
            >
              Cancel
            </Button>
          </Box>

          {message && (
            <Alert severity={messageType} sx={{ mt: 3 }} onClose={() => setMessage("")}>
              {message}
            </Alert>
          )}
        </Box>
      </Grid>
    </Modal>
  );
}
