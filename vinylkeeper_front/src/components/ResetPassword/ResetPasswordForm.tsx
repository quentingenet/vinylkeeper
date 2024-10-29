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
} from "@mui/material";
import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useLocation, useNavigate } from "react-router-dom";

import useDetectMobile from "@hooks/useDetectMobile";
import { IResetPassword } from "@models/IResetPassword";
import { resetPasswordService } from "@services/UserService";
import { IResetPasswordToBackend } from "@models/IResetPasswordToBackend";

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
    height: isMobile ? "280px" : "300px",
    width: "300px",
    bgcolor: "#fffbf9",
    border: "none",
    borderRadius: "5px",
    padding: "20px",
  };
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token: string | null = queryParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [openSnackBar, setOpenSnackBar] = useState(false);

  const handleCloseSnackBar = () => setOpenSnackBar(false);
  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => event.preventDefault();

  const validationSchema = yup.object({
    password: yup
      .string()
      .min(4, "Password must contain at least 4 characters.")
      .required("You must enter your password."),
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

  const submitResetPassword = (data: IResetPassword) => {
    if (!isValid) return;
    if (!token) return;
    const resetData: IResetPasswordToBackend = {
      token: token,
      new_password: data.password,
    };
    setIsLoading(true);

    resetPasswordService(resetData)
      .then(() => navigate("/"))
      .catch((error) => {
        console.error("Error while resetting password:", error);
        setOpenSnackBar(true);
      })
      .finally(() => setIsLoading(false));
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit(submitResetPassword)}
        sx={styleResetPassword}
        className={styles.globalForm}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
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
          </Grid>

          <Grid item xs={12}>
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
          </Grid>
        </Grid>

        <Grid
          container
          justifyContent="center"
          alignItems="center"
          spacing={2}
          mt={2}
        >
          <Grid item>
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
            Error while resetting password. Try again.
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}
