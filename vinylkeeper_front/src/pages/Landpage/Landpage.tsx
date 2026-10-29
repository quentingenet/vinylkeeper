import { useState, useCallback, useEffect } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { AUTH_PARAM, EGlobalUrls } from "@utils/GlobalUrls";
import { usePageMeta } from "@hooks/usePageMeta";
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
  // Without a session every unknown or private URL shows this page: all of them point to "/"
  usePageMeta({
    title: "Vinyl Keeper - Catalog and share your vinyl collection",
    description: "Vinyl Keeper is a free, open-source app to catalog your vinyl collection, discover new records, and share digging spots on an interactive map.",
    canonicalPath: EGlobalUrls.ROOT,
  });

  // "/?auth=login" or "/?auth=register" (links of the public Atlas) open that form at once
  const [searchParams, setSearchParams] = useSearchParams();
  const authParam = searchParams.get(AUTH_PARAM);
  const [login, setLogin] = useState<boolean>(authParam === "login");
  const [register, setRegister] = useState<boolean>(authParam === "register");
  const [open, setOpen] = useState<boolean>(authParam === "login" || authParam === "register");

  useEffect(() => {
    if (authParam !== null) setSearchParams({}, { replace: true });
  }, [authParam, setSearchParams]);
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
              {/* Grouped and shadowed: readable over the bright parts of the video */}
              <div className={styles.secondaryLinks}>
                <Link
                  component="button"
                  type="button"
                  underline="none"
                  onClick={() => setOpenPreview(true)}
                  className={`${styles.textTypo} ${styles.previewLink}`}
                  sx={{ "&:hover": { animation: `${growItem} 1s ease infinite` } }}
                >
                  Take a look inside&nbsp;?
                </Link>
                <span className={styles.orSeparator}>or</span>
                <Link
                  component={RouterLink}
                  to={EGlobalUrls.ATLAS}
                  underline="none"
                  className={`${styles.textTypo} ${styles.previewLink}`}
                  sx={{ "&:hover": { animation: `${growItem} 1s ease infinite` } }}
                >
                  just explore the Vinyl Atlas
                </Link>
              </div>
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
