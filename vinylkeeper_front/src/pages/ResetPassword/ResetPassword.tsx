import { useState } from "react";
import styles from "../../styles/pages/Landpage.module.scss";
import useDetectMobile from "@hooks/useDetectMobile";
import { usePageMeta } from "@hooks/usePageMeta";

import Footer from "@components/Footer/Footer";
import { Typography } from "@mui/material";
import videoBackground from "../../assets/landpageBackground.mp4";
import videoPoster from "../../assets/landpageBackgroundPoster.webp";
import ResetPasswordForm from "@components/ResetPassword/ResetPasswordForm";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation("auth");
  const { isMobile } = useDetectMobile();
  // Opened from an email link: nothing for search engines
  usePageMeta({ title: t("reset.metaTitle"), noIndex: true });

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
            playsInline
            poster={videoPoster}
            className={styles.videoBackgroundVinylKeeper}
          >
            <source src={videoBackground} type="video/mp4" />
          </video>
        )}
        <Typography variant="h1" className={styles.titleNormal}>
          {t("nav:brand")}
        </Typography>
        <div className={styles.textContainer}>
          <p className={styles.textTypo}>
            {t("reset.ready")}
            <br /> {t("reset.below")}
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
          withLanguage
        />
      </div>
    </>
  );
}
