import {
  Alert,
  Button,
  CircularProgress,
  Collapse,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { Email, Person2, Visibility, VisibilityOff } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { login as loginService } from "@services/UserService";
import { useUserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { emailValidator } from "@utils/Regex";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

type LoginProps = {
  setRegister: (value: boolean) => void;
  setLogin: (value: boolean) => void;
};

interface ILoginForm {
  email: string;
  password: string;
}

export default function Login({ setRegister, setLogin }: LoginProps) {
  const userContext = useUserContext();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [forgotPassword, setForgotPassword] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isMailSended, setIsMailSended] = useState<boolean>(false);
  const [errorRecovery, setErrorRecovery] = useState<boolean>(false);
  const [emailRecovery, setEmailrecovery] = useState<string>("");
  const [openSnackBar, setOpenSnackBar] = useState<boolean>(false);

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

  useEffect(() => {
    if (forgotPassword === true) {
      setTimeout(() => {
        setErrorRecovery(false);
        setIsMailSended(false);
        setForgotPassword(false);
      }, 1500);
    }
  }, [isMailSended, errorRecovery]);

  return (
    <>
      <Grid container className={styles.formContainer}>
        <form
          onSubmit={handleSubmit(submitLogin)}
          className={styles.globalForm}
        >
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
                <Grid item xs={12}>
                  <span className={styles.errorText}>
                    {errors.email.message}
                  </span>
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
                <Grid item>
                  <span className={styles.errorText}>
                    {errors.password.message}
                  </span>
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
                  onClick={() => setForgotPassword(!forgotPassword)}
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
                  <ArrowBackIcon />
                </IconButton>
              </Grid>
            </Grid>
            {forgotPassword && (
              <Grid
                container
                justifyContent={"center"}
                flexDirection={"column"}
              >
                <Grid container justifyContent={"center"}>
                  <Grid item marginTop={2}>
                    <TextField
                      id="emailRecovery"
                      label="Email"
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
                <Grid container justifyContent={"center"}>
                  <Grid item xs={10}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={() => {
                        if (emailRecovery.match(emailValidator)) {
                          /*resetAndChangePassword(emailRecovery);*/
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
                  <Grid item marginY={2}>
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
                              setForgotPassword(false);
                            }}
                          >
                            <CloseIcon fontSize="inherit" />
                          </IconButton>
                        }
                        sx={{ mb: 2 }}
                      >
                        Error, email not sent
                      </Alert>
                    </Collapse>
                  </Grid>
                )}
                {isMailSended && (
                  <Grid item>
                    <Collapse in={isMailSended}>
                      <Alert
                        action={
                          <IconButton
                            aria-label="close"
                            color="inherit"
                            size="small"
                            onClick={() => {
                              setIsMailSended(false);
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
                )}
              </Grid>
            )}
          </Grid>
        </form>
      </Grid>
    </>
  );
}
