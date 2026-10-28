import { createContext, useContext } from "react";
import type { ReplaceTarget } from "@utils/findPressing";
import { logger } from "@utils/logger";

export interface AddRecordOptions {
  // Collection chosen by default; every collection and the wishlist stay available
  presetCollectionId?: number;
  // "Find my pressing": the pressing picked replaces this album instead of being added
  replaceTarget?: ReplaceTarget;
  initialQuery?: string;
}

interface IAddRecordContext {
  openAddRecord: (options?: AddRecordOptions) => void;
  isAddRecordOpen: boolean;
}

// The dialog lives in AddRecordProvider: this file stays free of it, so that any component
// (the album modal included) can open it without an import cycle
export const AddRecordContext = createContext<IAddRecordContext>({
  openAddRecord: () => logger.warn("openAddRecord called outside AddRecordProvider"),
  isAddRecordOpen: false,
});

export function useAddRecord() {
  return useContext(AddRecordContext);
}
