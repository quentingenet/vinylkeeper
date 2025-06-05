import {
  Alert,
  Button,
  CircularProgress,
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

interface LoginProps {
  setRegister: (value: boolean) => void;
  setLogin: (value: boolean) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  openForgotPassword: boolean;
  setOpenForgotPassword: (value: boolean) => void;
}

export default function Login({
  setRegister,
  setLogin,
  open,
  setOpen,
  setOpenForgotPassword,
  openForgotPassword,
}: LoginProps) {
  const userContext = useUserContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [openSnackBar, setOpenSnackBar] = useState(false);
  const { isMobile } = useDetectMobile();

  const handleClose = () => {
    setOpen(false);
    setRegister(false);
    setLogin(false);
    setOpenForgotPassword(false);
  };

  const {
    handleSubmit,
    register,
    formState: { errors, isValid },
    watch,
  } = useForm<ILoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: yupResolver(loginValidationSchema),
  });

  const submitLogin = async () => {
    if (!isValid) return;
    userContext.setIsLoading(true);
    try {
      const response = await userApiService.login(watch());
      userContext.setIsUserLoggedIn(response.isLoggedIn);
      const userData = await userApiService.getCurrentUser();
      userContext.setCurrentUser(userData);
      navigate("/dashboard");
    } catch {
      setOpenSnackBar(true);
    } finally {
      userContext.setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
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
          opacity: isMobile ? 0.9 : 0.7,
        }}
      >
        <form
          onSubmit={handleSubmit(submitLogin)}
          className={styles.globalForm}
          style={{ width: "100%" }}
        >
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Person2 />
                  </InputAdornment>
                ),
                style: { textTransform: "lowercase" },
              }}
              {...register("email", {
                setValueAs: (value) => value.toLowerCase(),
              })}
            />
          </Grid>
          <Grid sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
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
              }}
              {...register("password")}
            />
          </Grid>
          <Grid
            display="flex"
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
            mt={3}
          >
            {userContext.isLoading ? (
              <CircularProgress />
            ) : (
              <Button type="submit" variant="contained">
                Login
              </Button>
            )}
            <Typography
              onClick={() => setOpenForgotPassword(true)}
              variant="caption"
              color="black"
              sx={{
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
              autoHideDuration={3000}
              onClose={() => setOpenSnackBar(false)}
            >
              <Alert onClose={() => setOpenSnackBar(false)} severity="error">
                Error while logging in. Try again.
              </Alert>
            </Snackbar>
          )}
        </form>
      </Grid>
    </Modal>
  );
}
