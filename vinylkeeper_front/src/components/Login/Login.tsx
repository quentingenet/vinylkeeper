import {
  Alert,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import {
  Person2,
  Visibility,
  VisibilityOff,
  ArrowBack,
} from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { login as loginService } from "@services/UserService";
import { useUserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { emailValidator } from "@utils/Regex";
import Modal from "@mui/material/Modal";
import useDetectMobile from "@hooks/useDetectMobile";
import ForgotPasswordModal from "./ForgotPasswordModal";
import { ILoginForm } from "@models/ILoginForm";

type LoginProps = {
  setRegister: (value: boolean) => void;
  setLogin: (value: boolean) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  openForgotPassword: boolean;
  setOpenForgotPassword: (value: boolean) => void;
};

export default function Login({
  setRegister,
  setLogin,
  open,
  setOpen,
  setOpenForgotPassword,
  openForgotPassword,
}: LoginProps) {
  const userContext = useUserContext();

  const handleClose = () => {
    setOpen(false);
    setRegister(false);
    setLogin(false);
    setOpenForgotPassword(false);
  };

  const { isMobile } = useDetectMobile();

  const styleLogin = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "5% auto",
    width: isMobile ? "80%" : "20%",
    bgcolor: "#fffbf9",
    border: "none",
    borderRadius: "5px",
  };

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [forgotPassword, setForgotPassword] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [openSnackBar, setOpenSnackBar] = useState<boolean>(false);

  const handleOpenForgotPassword = () => {
    setOpenForgotPassword(true);
  };

  const handleCloseSnackBar = () => {
    setOpenSnackBar(false);
  };
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const initialValues: ILoginForm = {
    email: "",
    password: "",
  };

  const validationSchema = yup.object({
    email: yup
      .string()
      .test("email", "Email not valid", (value) => {
        if (value != undefined) {
          return emailValidator.test(value);
        }
        return false;
      })
      .min(3, "Email must contain at least 4 characters.")
      .required("You must enter your Email."),
    password: yup
      .string()
      .min(4, "Password must contain at least 4 characters.")
      .required("You must enter your password."),
  });

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<ILoginForm>({
    defaultValues: initialValues,
    resolver: yupResolver(validationSchema),
  });

  const dataLogin: ILoginForm = {
    email: watch("email"),
    password: watch("password"),
  };

  const submitLogin = async () => {
    if (isValid) {
      try {
        setIsLoading(true);
        const response = await loginService(dataLogin);
        if (response) {
          if (response.status === 200) {
            const localStorageJwt = localStorage.getItem("jwt") || "";
            if (localStorageJwt !== null && localStorageJwt !== "") {
              localStorageJwt?.startsWith("Bearer")
                ? userContext.setJwt(localStorageJwt)
                : userContext.setJwt(`Bearer ${localStorageJwt}`);
              setIsLoading(false);
              userContext.setIsUserLoggedIn(true);
              navigate("/dashboard");
            }
          } else if (response.status === 401) {
            setIsLoading(false);
            setOpenSnackBar(true);
            console.log("Unauthorized: Invalid username or password.");
          } else {
            setIsLoading(false);
            setOpenSnackBar(true);
            console.log("Error while logging in.");
          }
        }
      } catch (error) {
        setIsLoading(false);
        setOpenSnackBar(true);
        console.log("Error:", error);
      }
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="child-modal-title"
        aria-describedby="child-modal-description"
        sx={styleLogin}
        className={styles.formContainer}
      >
        <form
          onSubmit={handleSubmit(submitLogin)}
          className={styles.globalForm}
        >
          <ForgotPasswordModal
            setForgotPassword={setForgotPassword}
            setOpenForgotPassword={setOpenForgotPassword}
            openForgotPassword={openForgotPassword}
          />
          <Grid container>
            <Grid item>
              <Controller
                name="email"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="email"
                    className={styles.inputForm}
                    label="Email"
                    type="text"
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            edge="end"
                          >
                            <Person2 />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    onChange={(e) =>
                      field.onChange(e.target.value.toLowerCase())
                    }
                  />
                )}
              />
              {errors.email && (
                <Grid container justifyContent={"center"}>
                  <Grid item>
                    <span className={styles.errorText}>
                      {errors.email.message}
                    </span>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>
          <Grid container>
            <Grid item>
              <Controller
                name="password"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    variant="outlined"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
              {errors.password && (
                <Grid container justifyContent={"center"}>
                  <Grid item>
                    <span className={styles.errorText}>
                      {errors.password.message}
                    </span>
                  </Grid>
                </Grid>
              )}
            </Grid>
            {openSnackBar && (
              <Snackbar
                open={openSnackBar}
                autoHideDuration={3000}
                onClose={handleCloseSnackBar}
              >
                <Alert
                  onClose={handleCloseSnackBar}
                  severity="error"
                  sx={{ width: "100%" }}
                >
                  Error while logging in. Try again.
                </Alert>
              </Snackbar>
            )}
          </Grid>

          <Grid
            container
            marginTop={2}
            justifyContent={"center"}
            flexDirection={"column"}
            alignItems={"center"}
          >
            <Grid item>
              {isLoading ? (
                <CircularProgress color="primary" />
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={forgotPassword ? true : false}
                >
                  Login
                </Button>
              )}
            </Grid>{" "}
            <Grid container justifyContent={"center"} alignItems={"center"}>
              <Grid item>
                <Typography
                  variant="caption"
                  color={"black"}
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    setForgotPassword(true);
                    handleOpenForgotPassword();
                  }}
                >
                  Forgot password ?
                </Typography>
              </Grid>
            </Grid>
            <Grid
              container
              justifyContent={"start"}
              alignItems={"center"}
              flexDirection={"row"}
            >
              <Grid item>
                <IconButton
                  onClick={() => {
                    setRegister(false);
                    setLogin(false);
                  }}
                >
                  <ArrowBack />
                </IconButton>
              </Grid>
            </Grid>
          </Grid>
        </form>
      </Modal>
    </>
  );
}
