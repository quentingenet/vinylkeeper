import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "../../hooks/useDetectMobile";

import Footer from "@components/Footer/Footer";
import { Typography } from "@mui/material";
import videoBackground from "../../assets/landpageBackground.mp4";
import ResetPasswordForm from "@components/ResetPassword/ResetPasswordForm";

export default function ResetPassword() {
  const { isMobile } = useDetectMobile();

  const [openTermsModal, setOpenTermsModal] = useState<boolean>(false);
  const [openFounderModal, setOpenFounderModal] = useState<boolean>(false);
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
        <Typography variant="h1" className={styles.titleNormal}>
          Vinyl Keeper
        </Typography>
        <div className={styles.textContainer}>
          <p className={styles.textTypo}>
            Ready to reset your password&nbsp;?
            <br /> Let’s get started just below&nbsp;!
          </p>

          <div className={styles.actionContainer}>
            <ResetPasswordForm />
          </div>
        </div>
        <Footer
          setOpenTermsModal={setOpenTermsModal}
          openTermsModal={openTermsModal}
          setOpenFounderModal={setOpenFounderModal}
          openFounderModal={openFounderModal}
        />
      </div>
    </>
  );
}
