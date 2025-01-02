import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Modal,
  TextField,
  Typography,
  Grid2,
} from "@mui/material";
import { useState } from "react";
import { Email, Person2, Visibility, VisibilityOff } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { register as registerService } from "@services/UserService";
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
}

const Register = ({
  setRegister,
  setLogin,
  setOpen,
  open,
  setOpenTermsModal,
}: RegisterProps) => {
  const userContext = useUserContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const { isMobile } = useDetectMobile();
  const {
    handleSubmit,
    control,
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

  const submitRegister = () => {
    if (!isValid) return;
    userContext.setIsLoading(true);

    registerService(watch())
      .then((response) => {
        userContext.setJwt(response);
        userContext.setIsFirstConnection(true);
        userContext.setIsUserLoggedIn(true);
        navigate("/dashboard");
      })
      .catch((error) => console.error("Erreur lors de l'inscription :", error))
      .finally(() => userContext.setIsLoading(false));
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="child-modal-title"
      aria-describedby="child-modal-description"
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
          onSubmit={handleSubmit(submitRegister)}
          className={styles.globalForm}
        >
          <Grid2 sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Username"
              type="text"
              variant="outlined"
              error={!!errors.username}
              helperText={errors.username?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Person2 />
                    </InputAdornment>
                  ),
                },
              }}
              {...control.register("username")}
              onChange={(e) => e.target.value.toLowerCase()}
            />
          </Grid2>

          <Grid2 sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              variant="outlined"
              error={!!errors.email}
              helperText={errors.email?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <Email />
                    </InputAdornment>
                  ),
                },
              }}
              {...control.register("email")}
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
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        sx={{ marginRight: "-8px" }}
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

          <Grid2 sx={{ width: "100%" }}>
            <TextField
              fullWidth
              label="Password confirmation"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              error={!!errors.passwordBis}
              helperText={errors.passwordBis?.message}
              slotProps={{
                input: {
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
                },
              }}
              {...control.register("passwordBis")}
            />
          </Grid2>

          <Grid2 sx={{ textAlign: "center" }}>
            <Typography color="black" variant="caption">
              I confirm that I have read, and accepted{" "}
              <span
                style={{ fontWeight: "bold", cursor: "pointer" }}
                onClick={() => setOpenTermsModal(true)}
              >
                <br />
                Terms and conditions
              </span>
            </Typography>
          </Grid2>
          <Grid2>
            <FormControlLabel
              label="I agree"
              control={<Checkbox {...control.register("isAcceptedTerms")} />}
              sx={{ color: "black" }}
            />
          </Grid2>

          <Grid2 display="flex" alignItems={"center"} justifyContent="center">
            {userContext.isLoading ? (
              <CircularProgress color="primary" sx={{ mb: 2 }} />
            ) : (
              <Button
                type="submit"
                variant="contained"
                disabled={!watch().isAcceptedTerms}
              >
                Register
              </Button>
            )}
          </Grid2>
        </form>
      </Grid2>
    </Modal>
  );
};

export default Register;
