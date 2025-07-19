import { Link } from "react-router-dom";
import styles from "../../styles/components/Footer.module.scss";
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
      <span>
        <Link
          to={"https://github.com/quentingenet/vinylkeeper"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code&nbsp;
        </Link>
      </span>
      <span onClick={() => setOpenFounderModal(true)}>
        made with&nbsp;<span className={styles.heartFooter}>❤</span>&nbsp;by
        Quentin Genet
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
