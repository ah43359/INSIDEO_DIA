"use client";

// Vestigial no-op context kept for compatibility with ProjectMap.tsx after the
// district-microcuenca selection UI was removed. The hook still exists so the
// map's click handlers stay wired, but with no provider in the tree it just
// returns a no-op default. Safe to delete once the dormant layer code is also
// purged from ProjectMap.tsx.

import { createContext, useContext } from "react";

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
