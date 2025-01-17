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
  return (
    <div className={styles.resultsContainer}>
      {results.length > 0 &&
      results.find((result: IRequestResults) => result.type === "artist") ? (
        <ResultArtist
          data={
            results.find((result: IRequestResults) => result.type === "artist")
              ?.data as IArtistRequestResults[]
          }
        />
      ) : (
        <ResultAlbums
          data={
            results.find((result: IRequestResults) => result.type === "album")
              ?.data as IAlbumRequestResults[]
          }
        />
      )}
    </div>
  );
}
