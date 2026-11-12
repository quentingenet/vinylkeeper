import { logger } from "@utils/logger";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  InputAdornment,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate } from "react-router-dom";
import useDetectMobile from "@hooks/useDetectMobile";
import {
  IResetPassword,
  IResetPasswordToBackend,
} from "@models/IResetPassword";
import { userApiService } from "@services/UserApiService";
import { RESET_LINK_UNUSABLE } from "@utils/resetLink";
import {
  passwordAtLeast8,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";
import { colors } from "@styles/colors";
import PasswordStrengthIndicator from "@components/UI/PasswordStrengthIndicator";

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const { isMobile } = useDetectMobile();
  const styleResetPassword = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    margin: "5% auto",
    // A minimum, not a fixed height: error messages and the strength indicator make the form taller
    minHeight: isMobile ? "280px" : "300px",
    width: "300px",
    bgcolor: colors.textLight,
    border: "2px solid black",
    borderRadius: "5px",
    padding: "20px",
    opacity: 0.92,
    boxShadow: 6,
  };
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token: string | null = queryParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openSnackBar, setOpenSnackBar] = useState(false);
  // Why the link cannot be used, known before the person types anything (null: it can, or not checked yet)
  const [linkProblem, setLinkProblem] = useState<string | null>(token ? null : RESET_LINK_UNUSABLE);
  const [errorMessage, setErrorMessage] = useState("Error while resetting password. Try again.");

  useEffect(() => {
    if (!token) return;
    let active = true;
    userApiService.checkResetToken(token).catch((error: unknown) => {
      // Only a link that is really unusable closes the form: a network error must not
      if (active && error instanceof Error && error.message === RESET_LINK_UNUSABLE) setLinkProblem(RESET_LINK_UNUSABLE);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const handleCloseSnackBar = () => setOpenSnackBar(false);
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => event.preventDefault();

  const validationSchema = yup.object({
    password: yup
      .string()
      .required("You must enter your password.")
      .matches(passwordWithLetter, "Your password must contain a letter")
      .matches(passwordWithNumber, "Your password must contain a number")
      .matches(
        passwordAtLeast8,
        "Your password must contain at least 8 characters"
      ),
    passwordBis: yup
      .string()
      .oneOf([yup.ref("password"), undefined], "Passwords must match.")
      .required("Please confirm your password."),
  });

  const {
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<IResetPassword>({
    defaultValues: { password: "", passwordBis: "" },
    resolver: yupResolver(validationSchema),
  });

  const password = useWatch({ control, name: "password" }) ?? "";

  const submitResetPassword = (data: IResetPassword) => {
    if (!isValid) return;
    // A link without its token (cut by the mail app, for instance) must not fail silently
    if (!token) {
      setOpenSnackBar(true);
      return;
    }
    const resetData: IResetPasswordToBackend = {
      token: token,
      new_password: data.password,
    };
    setIsLoading(true);

    userApiService
      .resetPassword(resetData)
      .then(() => navigate("/"))
      .catch((error: unknown) => {
        logger.error("Error while resetting password:", error);
        if (error instanceof Error && error.message === RESET_LINK_UNUSABLE) {
          setLinkProblem(RESET_LINK_UNUSABLE);
          return;
        }
        setErrorMessage("Error while resetting password. Try again.");
        setOpenSnackBar(true);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={(e) => { void handleSubmit(submitResetPassword)(e); }}
        sx={styleResetPassword}
        className={styles.globalForm}
      >
        <Typography
          id="reset-password-title"
          variant="h6"
          component="h2"
          sx={{ color: colors.slate, textAlign: "center", mb: 2, "&.MuiTypography-root": { fontFamily: "Oswald-Medium, sans-serif" } }}
        >
          Choose a new password
        </Typography>
        {linkProblem ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Alert severity="warning">{linkProblem}</Alert>
            <Button variant="contained" onClick={() => void navigate("/")}>
              Back to login
            </Button>
          </Box>
        ) : (
        <>
        <Grid container spacing={2}>
          <Grid>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
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
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            />
            <PasswordStrengthIndicator password={password} onLight />
          </Grid>

          <Grid>
            <Controller
              name="passwordBis"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Confirm new password"
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  error={!!errors.passwordBis}
                  helperText={errors.passwordBis?.message}
                  slotProps={{
                    input: {
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
                    },
                  }}
                />
              )}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ justifyContent: "center", alignItems: "center", mt: 2 }}>
          <Grid>
            {isLoading ? (
              <CircularProgress color="primary" />
            ) : (
              <div className={styles.buttonContainer}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={!isValid}
                >
                  Submit
                </Button>
              </div>
            )}
          </Grid>
        </Grid>

        </>
        )}

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
            {errorMessage}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
