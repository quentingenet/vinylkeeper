import type { ReactNode } from "react";
import useDetectMobile from "@hooks/useDetectMobile";
import { MOBILE_CARD_COLUMNS } from "@components/Collections/collectionGridLayout";
import { CompactCardsContext } from "@components/Collections/compactCards";
import styles from "../../styles/pages/Collection.module.scss";

/**
 * The grid of cards of a collection (albums, artists, wishlist). On a phone, MOBILE_CARD_COLUMNS cards
 * per row; with two, the cards are told to be compact.
 */
export default function CardGrid({ children }: { children: ReactNode }) {
  const { isMobile } = useDetectMobile();
  const compact = isMobile && MOBILE_CARD_COLUMNS === 2;
  return (
    <CompactCardsContext.Provider value={compact}>
      <div className={compact ? `${styles.resultsContainer} ${styles.twoColumns}` : styles.resultsContainer}>
        {children}
      </div>
    </CompactCardsContext.Provider>
  );
}
