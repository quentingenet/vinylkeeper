import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "../../hooks/useDetectMobile";
import Login from "@components/Login/Login";
import Register from "@components/Register/Register";
import Footer from "@components/Footer/Footer";
import { Button, Typography } from "@mui/material";

export default function Landpage() {
  const { isMobile } = useDetectMobile();

  const [login, setLogin] = useState<boolean>(false);
  const [register, setRegister] = useState<boolean>(false);

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
            <source src={"landpageBackground.mp4"} type="video/mp4" />
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
          {login && (
            <div
              className={
                login ? styles.actionContainerDisplayed : styles.actionContainer
              }
            >
              <Login setRegister={setRegister} setLogin={setLogin} />
            </div>
          )}
          {register && (
            <div className={styles.actionContainer}>
              <Register setRegister={setRegister} setLogin={setLogin} />
            </div>
          )}
          {!login && !register && (
            <div className={styles.buttonContainer}>
              <Button
                onClick={() => {
                  setLogin(true);
                }}
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  setRegister(true);
                }}
              >
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
