import { Link } from "react-router-dom";
import styles from "../../styles/components/Footer.module.scss";
import ModalTermsVinylKeeper from "@components/Modals/ModalTermsVinylKeeper";

type FooterProps = {
  setOpenTermsModal: (value: boolean) => void;
  openTermsModal: boolean;
};

export default function Footer(props: FooterProps) {
  const { setOpenTermsModal, openTermsModal } = props;

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
      <span>
        <Link
          to={"https://quentingenet.fr"}
          target="_blank"
          rel="noopener noreferrer"
        >
          made with&nbsp;<span className={styles.heartFooter}>❤</span>&nbsp;by
          Quentin Genet
        </Link>
      </span>
      <ModalTermsVinylKeeper
        setOpenTermsModal={setOpenTermsModal}
        openTermsModal={openTermsModal}
      />
    </div>
  );
}
