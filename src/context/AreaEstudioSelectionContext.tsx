"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface SelectionCtx {
  selectedIds: ReadonlySet<number>;
  toggle: (id: number) => void;
  clearSelection: () => void;
}

const SelectionContext = createContext<SelectionCtx>({
  selectedIds: new Set(),
  toggle: () => undefined,
  clearSelection: () => undefined,
});

export function useAreaEstudioSelection(): SelectionCtx {
  return useContext(SelectionContext);
}

export function AreaEstudioSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    new Set(),
  );

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return (
    <SelectionContext.Provider value={{ selectedIds, toggle, clearSelection }}>
      {children}
    </SelectionContext.Provider>
  );
}
