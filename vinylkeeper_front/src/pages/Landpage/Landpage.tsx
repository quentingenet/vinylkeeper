import { useState, useCallback } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "../../hooks/useDetectMobile";
import Login from "@components/Login/Login";
import Register from "@components/Register/Register";
import Footer from "@components/Footer/Footer";
import { Button, Typography } from "@mui/material";
import Background from "@components/Landpage/Background";

export default function Landpage() {
  const { isMobile } = useDetectMobile();

  const [login, setLogin] = useState<boolean>(false);
  const [register, setRegister] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [openForgotPassword, setOpenForgotPassword] = useState<boolean>(false);
  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);

  const handleLoginOpen = useCallback(() => {
    setLogin(true);
    setOpen(true);
  }, []);

  const handleRegisterOpen = useCallback(() => {
    setRegister(true);
    setOpen(true);
  }, []);

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
                Free and open-source,
                <br /> Vinyl Keeper is your go-to solution
                <br /> for effortlessly managing your vinyl collection with
                fun&nbsp;!
              </p>
              <div className={styles.buttonContainer}>
                <Button onClick={handleLoginOpen}>Login</Button>
                <Button onClick={handleRegisterOpen}>Register</Button>
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
                />
              )}
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
