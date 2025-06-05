import {
  Box,
  Button,
  Container,
  Grid,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Modal,
} from "@mui/material";
import { useState } from "react";
import { Email, Person2, Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { userApiService } from "@services/UserApiService";
import { useUserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import useDetectMobile from "@hooks/useDetectMobile";
import { IRegisterForm } from "@models/IRegisterForm";
import { getTimezone } from "@utils/GlobalUtils";
import { registerValidationSchema } from "@utils/validators/registerValidationSchema";
import styles from "../../styles/pages/Landpage.module.scss";

interface RegisterProps {
  setRegister: (value: boolean) => void;
  setLogin: (value: boolean) => void;
  setOpen: (value: boolean) => void;
  open: boolean;
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
  setOpenSnackBar: (value: boolean) => void;
}

const Register = ({
  setRegister,
  setLogin,
  setOpen,
  open,
  setOpenTermsModal,
  setOpenSnackBar,
}: RegisterProps) => {
  const userContext = useUserContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { isMobile } = useDetectMobile();
  const {
    handleSubmit,
    register,
    watch,
    formState: { errors, isValid },
  } = useForm<IRegisterForm>({
    defaultValues: { timezone: getTimezone() },
    resolver: yupResolver(registerValidationSchema),
  });

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => event.preventDefault();
  const handleClose = () => {
    setOpen(false);
    setRegister(false);
    setLogin(false);
  };

  const submitRegister = async () => {
    if (!isValid) return;

    userContext.setIsLoading(true);
    try {
      const response = await userApiService.register(watch());
      userContext.setIsUserLoggedIn(response.isLoggedIn);

      // Récupérer les données utilisateur via /me
      const userData = await userApiService.getCurrentUser();
      userContext.setCurrentUser(userData);

      navigate("/dashboard");
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);
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
          mt: isMobile ? "5dvh" : 0,
          mb: isMobile ? "5dvh" : 0,
          p: isMobile ? 2 : 4,
          opacity: isMobile ? 0.9 : 0.7,
        }}
      >
        <form
          onSubmit={handleSubmit(submitRegister)}
          className={styles.globalForm}
          style={{ width: "100%" }}
        >
          <Grid sx={{ width: "100%", mb: 2 }}>
            <TextField
              fullWidth
              label="Username"
              type="text"
              variant="outlined"
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Person2 />
                  </InputAdornment>
                ),
                style: { textTransform: "lowercase" },
              }}
              {...register("username", {
                setValueAs: (value) => value.toLowerCase(),
              })}
            />
          </Grid>

          <Grid sx={{ width: "100%", mb: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Email />
                  </InputAdornment>
                ),
                style: { textTransform: "lowercase" },
              }}
              {...register("email", {
                setValueAs: (value) => value.toLowerCase(),
              })}
            />
          </Grid>

          <Grid sx={{ width: "100%", mb: 2 }}>
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
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      sx={{ marginRight: "-8px" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register("password")}
            />
          </Grid>

          <Grid sx={{ width: "100%", mb: 2 }}>
            <TextField
              fullWidth
              label="Password confirmation"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              error={!!errors.passwordBis}
              helperText={errors.passwordBis?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      sx={{ marginRight: "-8px" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              {...register("passwordBis")}
            />
          </Grid>

          <Grid sx={{ textAlign: "center" }}>
            <Typography color="black" variant="caption" mb={2}>
              I confirm that I have read, and accepted{" "}
              <span
                style={{ fontWeight: "bold", cursor: "pointer" }}
                onClick={() => setOpenTermsModal(true)}
              >
                <br />
                Terms and conditions
              </span>
            </Typography>
          </Grid>
          <Grid sx={{ display: "flex", justifyContent: "center" }}>
            <FormControlLabel
              label="I agree"
              control={<Checkbox {...register("isAcceptedTerms")} />}
              sx={{ color: "black" }}
            />
          </Grid>

          <Grid display="flex" alignItems={"center"} justifyContent="center">
            {userContext.isLoading ? (
              <CircularProgress color="primary" sx={{ mb: 2 }} />
            ) : (
              <Button
                type="submit"
                variant="contained"
                disabled={!watch().isAcceptedTerms}
              >
                Join now
              </Button>
            )}
          </Grid>
        </form>
      </Grid>
    </Modal>
  );
};

export default Register;
