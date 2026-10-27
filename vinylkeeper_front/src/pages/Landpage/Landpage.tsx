import { useState, useCallback } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "@hooks/useDetectMobile";
import Login from "@components/Login/Login";
import Register from "@components/Register/Register";
import Footer from "@components/Footer/Footer";
import { Button, Link, Typography, Snackbar, Alert } from "@mui/material";
import Background from "@components/Landpage/Background";
import PreviewModal from "@components/Landpage/PreviewModal";
import { growItem } from "@utils/Animations";
import { previewSlides } from "@components/Landpage/previewSlides";

export default function Landpage() {
  const { isMobile } = useDetectMobile();

  const [login, setLogin] = useState<boolean>(false);
  const [register, setRegister] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [openForgotPassword, setOpenForgotPassword] = useState<boolean>(false);
  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);
  const [openFounderModal, setOpenFounderModal] = useState<boolean>(false);
  const [openPreview, setOpenPreview] = useState<boolean>(false);
  const [errorSnackbar, setErrorSnackbar] = useState({
    open: false,
    message: "",
  });

  const handleLoginOpen = useCallback(() => {
    setLogin(true);
    setOpen(true);
  }, []);

  const handleEnterFromPreview = useCallback(() => {
    setOpenPreview(false);
    handleLoginOpen();
  }, [handleLoginOpen]);

  const handleErrorSnackbarClose = () => {
    setErrorSnackbar({
      open: false,
      message: "",
    });
  };

  return (
    <>
      <div className={styles.globalContainer}>
        <Background isMobile={isMobile} />
        <Typography
          variant="h1"
          className={
            !login && !register ? styles.titleNormal : styles.titleHigher
          }
        >
          Vinyl Keeper
        </Typography>
        <div className={styles.textContainer}>
          {!login && !register ? (
            <>
              <p className={styles.textTypo}>
                The free and open-source way
                <br />
                to manage your vinyl collection
              </p>

              <div className={styles.buttonContainer}>
                <Button onClick={handleLoginOpen}>Enter</Button>
              </div>
              <Link
                component="button"
                type="button"
                underline="none"
                onClick={() => setOpenPreview(true)}
                className={styles.previewLink}
                sx={{ "&:hover": { animation: `${growItem} 1s ease infinite` } }}
              >
                Take a look inside&nbsp;?
              </Link>
            </>
          ) : (
            <div className={styles.actionContainer}>
              {login && open && (
                <Login
                  setRegister={setRegister}
                  setLogin={setLogin}
                  open={open}
                  setOpen={setOpen}
                  setOpenForgotPassword={setOpenForgotPassword}
                  openForgotPassword={openForgotPassword}
                />
              )}
              {register && open && (
                <Register
                  setRegister={setRegister}
                  setLogin={setLogin}
                  open={open}
                  setOpen={setOpen}
                  setOpenTermsModal={setOpenTermsModal}
                  openTermsModal={openTermsModal}
                  setErrorSnackbar={setErrorSnackbar}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <PreviewModal
        open={openPreview}
        slides={previewSlides}
        onClose={() => setOpenPreview(false)}
        onEnter={handleEnterFromPreview}
      />

      <Footer
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
        setOpenFounderModal={setOpenFounderModal}
        openFounderModal={openFounderModal}
      />

      <Snackbar
        open={errorSnackbar.open}
        autoHideDuration={6000}
        onClose={handleErrorSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: 9999 }}
      >
        <Alert
          onClose={handleErrorSnackbarClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
