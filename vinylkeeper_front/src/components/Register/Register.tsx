import {
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
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
import { IRegisterForm } from "@models/IregisterForm";
import ModalVinylKeeper from "@components/Modals/ModalVinylKeeper";

interface IRegisterProps {
  setRegister: React.Dispatch<React.SetStateAction<boolean>>;
  setLogin: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Login(props: IRegisterProps) {
  const { setRegister, setLogin } = props;
  const userContext = useUserContext();

  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [openTermsModal, setOpenTermsModal] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
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
      .required("Enter your password.")
      .matches(passwordWithLetter, "Your password must contain a letter")
      .matches(passwordWithNumber, "Your password must contain a number")
      .matches(
        passwordAtLeast4,
        "Your password must contain at least 4 characters"
      )
      .oneOf(
        [yup.ref("password"), ""],
        "The password confirmation must correspond to the chosen password"
      ),
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
    <>
      <Grid container className={styles.formContainer}>
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
                sx={{ color: "black", fontSize: "0.8em" }}
              >
                <Typography sx={{ color: "black" }} variant={"caption"}>
                  I confirm that I have read, and accepted
                </Typography>
                <br />
                <Typography
                  sx={{ color: "black", cursor: "pointer", fontWeight: "bold" }}
                  variant={"caption"}
                  onClick={() => setOpenTermsModal(true)}
                >
                  Terms and conditions
                </Typography>
              </Grid>
              <ModalVinylKeeper
                openTermsModal={openTermsModal}
                setOpenTermsModal={setOpenTermsModal}
              />
            </Grid>
            <Grid container justifyContent={"center"}>
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
    </>
  );
}
