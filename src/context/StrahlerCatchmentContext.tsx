"use client";

// Vestigial no-op context kept for compatibility with ProjectMap.tsx after the
// Strahler-catchment selection UI was removed. See AreaEstudioSelectionContext
// for the same pattern.

import { createContext, useContext } from "react";

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
