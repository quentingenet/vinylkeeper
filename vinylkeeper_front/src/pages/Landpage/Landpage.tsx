import { useState, useCallback, useEffect } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { AUTH_PARAM, EGlobalUrls, NEXT_PARAM, safeNextPath } from "@utils/GlobalUrls";
import { usePageMeta } from "@hooks/usePageMeta";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "@hooks/useDetectMobile";
import Login from "@components/Login/Login";
import Register from "@components/Register/Register";
import Footer from "@components/Footer/Footer";
import { Button, Link, Typography, Snackbar, Alert } from "@mui/material";
import Background from "@components/Landpage/Background";
import { growItem } from "@utils/Animations";
import { useTranslation } from "react-i18next";

export default function Landpage() {
  const { t } = useTranslation("landing");
  const { isMobile } = useDetectMobile();
  // Without a session every unknown or private URL shows this page: all of them point to "/"
  usePageMeta({
    title: t("common:meta.title"),
    description: t("metaDescription"),
    canonicalPath: EGlobalUrls.ROOT,
  });

  // "/?auth=login" or "/?auth=register" (links of the public Atlas) open that form at once
  const [searchParams, setSearchParams] = useSearchParams();
  const authParam = searchParams.get(AUTH_PARAM);
  const [login, setLogin] = useState<boolean>(authParam === "login");
  const [register, setRegister] = useState<boolean>(authParam === "register");
  const [open, setOpen] = useState<boolean>(authParam === "login" || authParam === "register");
  // Kept: the parameters leave the URL below, and the visitor may switch between the two forms
  const [nextPath] = useState(() => safeNextPath(searchParams.get(NEXT_PARAM)));

  useEffect(() => {
    if (authParam !== null) setSearchParams({}, { replace: true });
  }, [authParam, setSearchParams]);
  const [openForgotPassword, setOpenForgotPassword] = useState<boolean>(false);
  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);
  const [openFounderModal, setOpenFounderModal] = useState<boolean>(false);
  const [errorSnackbar, setErrorSnackbar] = useState({
    open: false,
    message: "",
  });

  const handleLoginOpen = useCallback(() => {
    setLogin(true);
    setOpen(true);
  }, []);

  const handleErrorSnackbarClose = () => {
    setErrorSnackbar({
      open: false,
      message: "",
    });
  };

  return (
    <>
      <div className={`${styles.globalContainer} ${!login && !register ? styles.centered : ""}`}>
        <Background isMobile={isMobile} />
        {/* On a phone the form covers the screen from the top: the title would show through it */}
        {(!isMobile || (!login && !register)) && (
        <Typography
          // A new key when a form opens or closes: the title is drawn again, fading in at its new place
          key={!login && !register ? "home" : "form"}
          variant="h1"
          className={`${!login && !register ? styles.titleNormal : styles.titleHigher} ${styles.titleFadeIn}`}
        >
          {t("nav:brand")}
        </Typography>
        )}
        <div className={styles.textContainer}>
          {!login && !register ? (
            <>
              <div className={styles.buttonContainer}>
                <Button onClick={handleLoginOpen}>{t("enter")}</Button>
              </div>
              {/* Shadowed: readable over the bright parts of the video. The tour of the app
                  ("Take a look inside?") lives in the join popup of the public Atlas */}
              <div className={styles.secondaryLinks}>
                <span className={styles.orSeparator}>{t("or")}</span>
                <Link
                  component={RouterLink}
                  to={EGlobalUrls.ATLAS}
                  underline="none"
                  className={`${styles.textTypo} ${styles.previewLink}`}
                  sx={{ "&:hover": { animation: `${growItem} 1s ease infinite` } }}
                >
                  {t("exploreAtlas")}
                </Link>
              </div>
            </>
          ) : (
            <div className={styles.actionContainer}>
              {login && open && (
                <Login
                  nextPath={nextPath}
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
                  nextPath={nextPath}
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

      <Footer
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
        setOpenFounderModal={setOpenFounderModal}
        openFounderModal={openFounderModal}
        withLanguage
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
