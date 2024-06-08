import { Link } from "react-router-dom";
import styles from "../../styles/components/Footer.module.scss";
export default function Footer() {
  return (
    <div className={styles.footerContainer}>
      <div className={styles.footerLandpage}>
        <span>Terms and conditions&nbsp;</span>
        <span>Contact&nbsp;</span>
        <span>
          <Link
            to={"https://github.com/quentingenet/vinyl_keeper"}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code&nbsp;
          </Link>
        </span>
        <span>
          <Link
            to={"https://www.linkedin.com/in/quentin-genet/"}
            target="_blank"
            rel="noopener noreferrer"
          >
            made with&nbsp;<span className={styles.heartFooter}>❤</span>&nbsp;by
            Quentin Genet
          </Link>
        </span>
      </div>
    </div>
  );
}
