import styles from "../../styles/pages/Landpage.module.scss";
import videoBackground from "../../assets/landpageBackground.mp4";

interface BackgroundProps {
  isMobile: boolean;
}

const Background: React.FC<BackgroundProps> = ({ isMobile }) =>
  isMobile ? (
    <div className={styles.imgMobileBackgroundVinylKeeper}></div>
  ) : (
    <video autoPlay muted loop className={styles.videoBackgroundVinylKeeper}>
      <source src={videoBackground} type="video/mp4" />
    </video>
  );

export default Background;
