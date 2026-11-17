import { Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import useDetectMobile from "@hooks/useDetectMobile";
import DesktopThemeAppVinylKeeper from "@styles/themes/app/DesktopThemeAppVinylKeeper";
import MobileThemeAppVinylKeeper from "@styles/themes/app/MobileThemeAppVinylKeeper";
import styles from "../../styles/components/Footer.module.scss";
import { growItem } from "@utils/Animations";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";
import ModalFounderVinylKeeper from "@components/Modals/ModalFounderVinylKeeper";
import LanguageMenu from "@components/UI/LanguageMenu";
import { useTranslation } from "react-i18next";

type FooterProps = {
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
  setOpenFounderModal: (value: boolean) => void;
  openFounderModal: boolean;
  /** The language picker, small, right after the name: for the pages without a header to hold it */
  withLanguage?: boolean;
};

export default function Footer(props: FooterProps) {
  const {
    setOpenTermsModal,
    openTermsModal,
    setOpenFounderModal,
    openFounderModal,
    withLanguage = false,
  } = props;
  const { isMobile } = useDetectMobile();
  const { t } = useTranslation("landing");

  return (
    // mui-fixed: a fixed element gets the scrollbar compensation of the popups, so it does not jump
    <div className={`${styles.footerContainer} mui-fixed`}>
      <span onClick={() => setOpenTermsModal(true)}>
        {t("footer.terms")}&nbsp;
      </span>
      <span onClick={() => setOpenFounderModal(true)}>
        &nbsp;{t("footer.madeWith")}&nbsp;
        <Box
          component="span"
          sx={{
            color: "red",
            display: "inline-block",
            fontSize: "1.18em",
            lineHeight: 1,
            verticalAlign: "-0.06em",
            animation: `${growItem} 0.7s infinite`,
          }}
        >
          ❤
        </Box>
        &nbsp;{t("footer.by")}
      </span>
      {withLanguage && (
        // Next to the name, not a whole gap away, and on the line of the footer texts: their size and height
        <LanguageMenu
          sx={{
            ml: "-0.75rem",
            minHeight: 0,
            px: 0.5,
            py: 0,
            lineHeight: "normal",
            fontSize: { xs: "0.7rem", md: "0.75rem" },
          }}
        />
      )}
      {/* The theme of the app, whatever page opens them (home page or Atlas): same popups, same gold buttons */}
      <ThemeProvider theme={isMobile ? MobileThemeAppVinylKeeper : DesktopThemeAppVinylKeeper}>
        <ModalTermsVinylKeeper
          setOpenTermsModal={setOpenTermsModal}
          openTermsModal={openTermsModal}
        />
        <ModalFounderVinylKeeper
          setOpenFounderModal={setOpenFounderModal}
          openFounderModal={openFounderModal}
        />
      </ThemeProvider>
    </div>
  );
}
