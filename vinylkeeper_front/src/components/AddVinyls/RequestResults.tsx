import {
  IAlbumRequestResults,
  IArtistRequestResults,
  IRequestResults,
} from "@models/IRequestProxy";
import ResultArtist from "@components/AddVinyls/ResultArtist";
import styles from "../../styles/pages/AddVinyls.module.scss";
import ResultAlbums from "./ResultAlbums";

interface IRequestResultsProps {
  results: IRequestResults[];
}

export default function RequestResults({ results }: IRequestResultsProps) {
  if (results.length === 0) {
    return <></>;
  }

  const artistResult = results.find(
    (result: IRequestResults) => result.type === "artist"
  );
  const albumResult = results.find(
    (result: IRequestResults) => result.type === "album"
  );

  return (
    <div
      className={styles.resultsContainer}
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
      }}
    >
      {artistResult ? (
        <ResultArtist data={artistResult.data as IArtistRequestResults[]} />
      ) : (
        <ResultAlbums data={albumResult?.data as IAlbumRequestResults[]} />
      )}
    </div>
  );
}
