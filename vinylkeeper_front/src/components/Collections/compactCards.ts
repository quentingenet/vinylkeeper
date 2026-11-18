import { createContext, useContext } from "react";

/** True inside a CardGrid that shows two cards per row: the cards draw themselves smaller */
export const CompactCardsContext = createContext(false);

export const useCompactCards = (): boolean => useContext(CompactCardsContext);
