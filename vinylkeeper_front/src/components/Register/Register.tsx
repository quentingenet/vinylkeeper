import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import { Email, Person2, Visibility, VisibilityOff } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { register as registerService } from "@services/UserService";
import { useUserContext } from "../../contexts/UserContext";
import { useNavigate } from "react-router-dom";
import {
  emailValidator,
  passwordAtLeast4,
  passwordWithLetter,
  passwordWithNumber,
} from "@utils/Regex";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";
import useDetectMobile from "@hooks/useDetectMobile";
import { IRegisterForm } from "@models/IRegisterForm";

type RegisterProps = {
  setRegister: (value: boolean) => void;
  setLogin: (value: boolean) => void;
  open: boolean;
  setOpen: (value: boolean) => void;
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
};

export default function Register({
  setRegister,
  setLogin,
  setOpen,
  open,
  setOpenTermsModal,
  openTermsModal,
}: RegisterProps) {
  const userContext = useUserContext();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const handleClose = () => {
    setOpen(false);
    setRegister(false);
    setLogin(false);
  };

  const initialRegisterValues: IRegisterForm = {
    username: "",
    email: "",
    password: "",
    passwordBis: "",
    isAcceptedTerms: false,
  };

  const validationSchema = yup.object({
    username: yup
      .string()
      .min(3, "Username must contain at least 3 characters")
      .matches(/^[a-z0-9]+$/, "Must be to lowercase")
      .required("Enter your username"),
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
    isAcceptedTerms: yup.boolean().required("You must accept terms to use OWT"),
    password: yup
      .string()
      .required("Enter your password.")
      .matches(passwordWithLetter, "Your password must contain a letter")
      .matches(passwordWithNumber, "Your password must contain a number")
      .matches(
        passwordAtLeast4,
        "Your password must contain at least 4 characters"
      ),
    passwordBis: yup
      .string()
      .required("Confirm your password.")
      .matches(passwordWithLetter, "Password must contain a letter")
      .matches(passwordWithNumber, "Password must contain a number")
      .matches(passwordAtLeast4, "Password must contain at least 4 characters")
      .oneOf([yup.ref("password"), ""], "It must be the same as the password"),
  });

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isValid },
  } = useForm<IRegisterForm>({
    defaultValues: initialRegisterValues,
    resolver: yupResolver(validationSchema),
  });

  const dataRegister: IRegisterForm = {
    username: watch("username"),
    email: watch("email"),
    password: watch("password"),
    passwordBis: watch("passwordBis"),
    isAcceptedTerms: watch("isAcceptedTerms"),
  };

  const { isMobile } = useDetectMobile();

  const styleRegister = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "auto",
    width: isMobile ? "80%" : "20%",
    bgcolor: "#fffbf9",
    border: "none",
    borderRadius: "5px",
  };

  const submitRegister = async () => {
    if (isValid) {
      try {
        setIsLoading(true);

        const response = await registerService(dataRegister);

        if (response) {
          const localStorageJwt = localStorage.getItem("jwt") || "";

          if (localStorageJwt !== null && localStorageJwt !== "") {
            userContext.setJwt(
              localStorageJwt.startsWith("Bearer")
                ? localStorageJwt
                : `Bearer ${localStorageJwt}`
            );

            setIsLoading(false);
            userContext.setIsFirstConnection(true);
            userContext.setIsUserLoggedIn(false);
            navigate("/");
          }
        }
      } catch (error) {
        setIsLoading(false);
        console.error("Erreur lors de l'inscription :", error);
      } finally {
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="child-modal-title"
      aria-describedby="child-modal-description"
      sx={styleRegister}
      className={styles.formContainer}
    >
      <Grid container justifyContent={"center"}>
        <form
          onSubmit={handleSubmit(submitRegister)}
          className={styles.globalForm}
        >
          <Grid container justifyContent={"center"}>
            <Grid item>
              <Controller
                name="username"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="username"
                    label="Username"
                    type="text"
                    variant="outlined"
                    error={Boolean(errors.username)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Person2 />
                        </InputAdornment>
                      ),
                    }}
                    onChange={(e) =>
                      field.onChange(e.target.value.toLowerCase())
                    }
                  />
                )}
              />
              {errors.username && (
                <Grid container justifyContent={"center"}>
                  <Grid item>
                    <span className={styles.errorText}>
                      {errors.username.message}
                    </span>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>

          <Grid container justifyContent={"center"}>
            <Grid item>
              <Controller
                name="email"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="email"
                    label="Email"
                    type="email"
                    variant="outlined"
                    error={Boolean(errors.email)}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Email />
                        </InputAdornment>
                      ),
                    }}
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

          <Grid container justifyContent={"center"}>
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
                    error={Boolean(errors.password)}
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
          </Grid>
          <Grid container justifyContent={"center"}>
            <Grid item>
              <Controller
                name="passwordBis"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    id="passwordBis"
                    label="Confirm password"
                    type={showPassword ? "text" : "password"}
                    variant="outlined"
                    error={Boolean(errors.passwordBis)}
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
              {errors.passwordBis && (
                <Grid container justifyContent={"center"}>
                  <Grid item>
                    <span className={styles.errorText}>
                      {errors.passwordBis.message}
                    </span>
                  </Grid>
                </Grid>
              )}
            </Grid>
          </Grid>

          <Grid container justifyContent={"center"} alignItems={"center"}>
            <Grid container justifyContent={"center"}>
              <Grid
                item
                justifyContent={"center"}
                sx={{ color: "black", fontSize: "0.8rem", textAlign: "center" }}
              >
                <Typography sx={{ color: "black" }} variant={"caption"}>
                  I confirm that I have read, and accepted
                </Typography>
                <br />
                <Typography
                  sx={{
                    color: "black",
                    cursor: "pointer",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                  variant={"caption"}
                  onClick={() => setOpenTermsModal(true)}
                >
                  Terms and conditions
                </Typography>
              </Grid>
              <ModalTermsVinylKeeper
                openTermsModal={openTermsModal}
                setOpenTermsModal={setOpenTermsModal}
              />
            </Grid>
            <Grid
              container
              justifyContent={"center"}
              sx={{ minWidth: "250px" }}
            >
              <Grid item sx={{ color: "black" }}>
                <Controller
                  name="isAcceptedTerms"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      {...field}
                      required={watch("isAcceptedTerms") ? false : true}
                      label={"I agree"}
                      value={true}
                      control={<Checkbox />}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Grid>
          <Grid container justifyContent={"center"}>
            <Grid item>
              {isLoading ? (
                <CircularProgress color="primary" />
              ) : (
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  Register
                </Button>
              )}
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
        </form>
      </Grid>
    </Modal>
  );
}
