import { Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import useDetectMobile from "@hooks/useDetectMobile";
import DesktopThemeAppVinylKeeper from "@styles/themes/app/DesktopThemeAppVinylKeeper";
import MobileThemeAppVinylKeeper from "@styles/themes/app/MobileThemeAppVinylKeeper";
import styles from "../../styles/components/Footer.module.scss";
import { growItem } from "@utils/Animations";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";
import ModalFounderVinylKeeper from "@components/Modals/ModalFounderVinylKeeper";

type FooterProps = {
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
  setOpenFounderModal: (value: boolean) => void;
  openFounderModal: boolean;
};

export default function Footer(props: FooterProps) {
  const {
    setOpenTermsModal,
    openTermsModal,
    setOpenFounderModal,
    openFounderModal,
  } = props;
  const { isMobile } = useDetectMobile();

  return (
    // mui-fixed: a fixed element gets the scrollbar compensation of the popups, so it does not jump
    <div className={`${styles.footerContainer} mui-fixed`}>
      <span onClick={() => setOpenTermsModal(true)}>
        Terms and conditions&nbsp;
      </span>
      <span onClick={() => setOpenFounderModal(true)}>
        &nbsp;made with&nbsp;
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
        &nbsp;by Quentin Genet
      </span>
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
