import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "../../hooks/useDetectMobile";
import Login from "@components/Login/Login";
import Register from "@components/Register/Register";
import Footer from "@components/Footer/Footer";
import { Button, Typography } from "@mui/material";
import videoBackground from "../../assets/landpageBackground.mp4";

export default function Landpage() {
  const { isMobile } = useDetectMobile();

  const [login, setLogin] = useState<boolean>(false);
  const [register, setRegister] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [openForgotPassword, setOpenForgotPassword] = useState<boolean>(false);
  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);

  return (
    <>
      <div className={styles.globalContainer}>
        {isMobile ? (
          <div className={styles.imgMobileBackgroundVinylKeeper}></div>
        ) : (
          <video
            autoPlay
            muted
            loop
            className={styles.videoBackgroundVinylKeeper}
          >
            <source src={videoBackground} type="video/mp4" />
          </video>
        )}
        <Typography
          variant="h1"
          className={
            !login && !register ? styles.titleNormal : styles.titleHigher
          }
        >
          Vinyl Keeper
        </Typography>
        <div className={styles.textContainer}>
          {!login && !register && (
            <p className={styles.textTypo}>
              Free and open-source,
              <br /> Vinyl Keeper is your go-to solution
              <br /> for effortlessly managing your vinyl collection with
              fun&nbsp;!
            </p>
          )}
          {login && open && (
            <div
              className={
                login ? styles.actionContainerDisplayed : styles.actionContainer
              }
            >
              <Login
                setRegister={setRegister}
                setLogin={setLogin}
                open={open}
                setOpen={setOpen}
                setOpenForgotPassword={setOpenForgotPassword}
                openForgotPassword={openForgotPassword}
              />
            </div>
          )}
          {register && open && (
            <div className={styles.actionContainer}>
              <Register
                setRegister={setRegister}
                setLogin={setLogin}
                open={open}
                setOpen={setOpen}
                setOpenTermsModal={setOpenTermsModal}
                openTermsModal={openTermsModal}
              />
            </div>
          )}
          {!login && !register && (
            <div className={styles.buttonContainer}>
              <Button
                onClick={() => {
                  setLogin(true);
                  setOpen(true);
                }}
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  setRegister(true);
                  setOpen(true);
                }}
              >
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
      />
    </>
  );
}
