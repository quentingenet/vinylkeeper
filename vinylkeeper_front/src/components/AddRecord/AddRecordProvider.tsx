import { useCallback, useMemo, useState, type ReactNode } from "react";
import AddRecordDialog from "@components/AddRecord/AddRecordDialog";
import { AddRecordContext, type AddRecordOptions } from "@contexts/AddRecordContext";

/** Search and add a record from anywhere: one dialog for the whole app. */
export default function AddRecordProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<AddRecordOptions | null>(null);

  const openAddRecord = useCallback((opened: AddRecordOptions = {}) => setOptions(opened), []);
  const value = useMemo(() => ({ openAddRecord, isAddRecordOpen: options !== null }), [openAddRecord, options]);

  return (
    <AddRecordContext.Provider value={value}>
      {children}
      {options && <AddRecordDialog options={options} onClose={() => setOptions(null)} />}
    </AddRecordContext.Provider>
  );
}
