import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  Modal,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Person2, Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { userApiService } from "@services/UserApiService";
import { useUserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import useDetectMobile from "@hooks/useDetectMobile";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { ILoginForm } from "@models/ILoginForm";
import { loginValidationSchema } from "@utils/validators/loginValidationSchema";
import styles from "../../styles/pages/Landpage.module.scss";
import VinylSpinner from "@components/UI/VinylSpinner";
import AuthSwitchLink from "@components/Auth/AuthSwitchLink";
import { colors } from "@styles/colors";

interface LoginProps {
  setRegister: (value: boolean) => void;
  setLogin: (value: boolean) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  openForgotPassword: boolean;
  setOpenForgotPassword: (value: boolean) => void;
  /** The page to open once logged in, the dashboard by default */
  nextPath?: string | null;
}

export default function Login({
  setRegister,
  setLogin,
  open,
  setOpen,
  setOpenForgotPassword,
  openForgotPassword,
  nextPath,
}: LoginProps) {
  const userContext = useUserContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [openSnackBar, setOpenSnackBar] = useState(false);
  const [loginError, setLoginError] = useState("");
  const { isMobile } = useDetectMobile();

  const handleClose = () => {
    setOpen(false);
    setRegister(false);
    setLogin(false);
    setOpenForgotPassword(false);
  };

  const switchToRegister = () => {
    setOpenForgotPassword(false);
    setLogin(false);
    setRegister(true);
  };

  const {
    handleSubmit,
    register,
    formState: { errors, isValid },
  } = useForm<ILoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: yupResolver(loginValidationSchema),
  });

  const submitLogin = async (data: ILoginForm) => {
    if (!isValid) return;
    userContext.setIsLoading(true);
    try {
      const response = await userApiService.login(data);
      userContext.setIsUserLoggedIn(response.isLoggedIn);
      const userData = await userApiService.getCurrentUser();
      userContext.setCurrentUser(userData);
      void navigate(nextPath ?? "/dashboard");
    } catch (error: unknown) {
      setLoginError(error instanceof Error ? error.message : "Error while logging in. Try again.");
      setOpenSnackBar(true);
    } finally {
      userContext.setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="login-title"
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
        sx={{
          justifyContent: "center",
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
          opacity: 0.92,
        }}
      >
        <form
          onSubmit={(e) => { void handleSubmit(submitLogin)(e); }}
          className={styles.globalForm}
          style={{ width: "100%" }}
        >
          <Typography
            id="login-title"
            variant="h6"
            component="h2"
            sx={{ color: colors.slate, textAlign: "center", mb: 2, "&.MuiTypography-root": { fontFamily: "Oswald-Medium, sans-serif" } }}
          >
            Log in to your account
          </Typography>
          {/* Right under the title: someone without an account sees at once how to create one */}
          <Box sx={{ mb: 2, display: "flex", justifyContent: "center" }}>
            <AuthSwitchLink
              prompt="No account yet?"
              actionLabel="Sign up"
              onClick={switchToRegister}
            />
          </Box>
          <ForgotPasswordModal
            setForgotPassword={setOpenForgotPassword}
            setOpenForgotPassword={setOpenForgotPassword}
            openForgotPassword={openForgotPassword}
          />
          <Grid sx={{ width: "100%", mb: 2 }}>
            <TextField
              fullWidth
              label="Email"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register("email", {
                setValueAs: (value: unknown): string => String(value).toLowerCase(),
              })}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Person2 />
                    </InputAdornment>
                  ),
                  style: { textTransform: "lowercase" },
                },
              }} />
          </Grid>
          <Grid sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register("password")}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        sx={{ marginRight: "-8px" }}
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }} />
          </Grid>
          <Grid
            sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column", mt: 3 }}
          >
            {userContext.isLoading ? (
              <VinylSpinner />
            ) : (
              <Button type="submit" variant="contained">
                Login
              </Button>
            )}
            <Typography
              onClick={() => setOpenForgotPassword(true)}
              variant="caption"
              sx={{
                color: colors.slate,
                textAlign: "center",
                mb: 1,
                cursor: "pointer",
                display: openForgotPassword ? "none" : "block",
              }}
            >
              Forgot password?
            </Typography>
          </Grid>
          {openSnackBar && (
            <Snackbar
              open={openSnackBar}
              autoHideDuration={5000}
              onClose={() => setOpenSnackBar(false)}
            >
              <Alert onClose={() => setOpenSnackBar(false)} severity="error">
                {loginError}
              </Alert>
            </Snackbar>
          )}
        </form>
      </Grid>
    </Modal>
  );
}
