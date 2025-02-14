import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
  Grid2,
} from "@mui/material";
import { useState } from "react";
import { Person2, Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { login as loginService } from "@services/UserService";
import { useUserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import Modal from "@mui/material/Modal";
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
    control,
    formState: { errors, isValid },
    watch,
  } = useForm<ILoginForm>({
    defaultValues: { email: "", password: "" },
    resolver: yupResolver(loginValidationSchema),
  });

  const submitLogin = () => {
    if (!isValid) return;

    userContext.setIsLoading(true);
    loginService(watch())
      .then(() => {
        userContext.setIsUserLoggedIn(true);
        navigate("/dashboard");
      })
      .catch(() => setOpenSnackBar(true))
      .finally(() => userContext.setIsLoading(false));
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="login-modal-title"
      aria-describedby="login-modal-description"
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "auto",
        width: isMobile ? "80%" : "20%",
        bgcolor: "#fffbf9",
        border: "none",
        borderRadius: "5px",
      }}
      className={styles.formContainer}
    >
      <Grid2 container spacing={2} justifyContent="center">
        <form
          onSubmit={handleSubmit(submitLogin)}
          className={styles.globalForm}
        >
          <ForgotPasswordModal
            setForgotPassword={setOpenForgotPassword}
            setOpenForgotPassword={setOpenForgotPassword}
            openForgotPassword={openForgotPassword}
          />
          <Grid2 sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Email"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Person2 />
                    </InputAdornment>
                  ),
                  style: { textTransform: "lowercase" },
                },
              }}
              {...control.register("email", {
                setValueAs: (value) => value.toLowerCase(),
              })}
            />
          </Grid2>

          <Grid2 sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              error={!!errors.password}
              helperText={errors.password?.message}
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
              }}
              {...control.register("password")}
            />
          </Grid2>

          <Grid2
            display="flex"
            justifyContent="center"
            alignItems="center"
            flexDirection="column"
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
              sx={{ textAlign: "center", mb: 1, cursor: "pointer" }}
            >
              Forgot password?
            </Typography>
          </Grid2>
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
      </Grid2>
    </Modal>
  );
}
