"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface StrahlerSelectionCtx {
  selectedIds: ReadonlySet<number>;
  toggle: (id: number) => void;
  clearSelection: () => void;
}

const StrahlerSelectionContext = createContext<StrahlerSelectionCtx>({
  selectedIds: new Set(),
  toggle: () => undefined,
  clearSelection: () => undefined,
});

export function useStrahlerCatchmentSelection(): StrahlerSelectionCtx {
  return useContext(StrahlerSelectionContext);
}

export function StrahlerCatchmentProvider({
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
    <StrahlerSelectionContext.Provider
      value={{ selectedIds, toggle, clearSelection }}
    >
      {children}
    </StrahlerSelectionContext.Provider>
  );
}
