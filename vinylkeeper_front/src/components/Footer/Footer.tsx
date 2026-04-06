import { Box } from "@mui/material";
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

  return (
    <div className={styles.footerContainer}>
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
      <ModalTermsVinylKeeper
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
      />
      <ModalFounderVinylKeeper
        setOpenFounderModal={setOpenFounderModal}
        openFounderModal={openFounderModal}
      />
    </div>
  );
}
