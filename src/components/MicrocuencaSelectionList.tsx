"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAreaEstudioSelection } from "@/context/AreaEstudioSelectionContext";
import { saveAreaEstudioFromMicrocuencas } from "@/app/(app)/projects/[id]/actions";
import type { MicrocuencaRow } from "@/lib/types";
import { useState } from "react";

interface MicrocuencaSelectionListProps {
  districtMicrocuencas: MicrocuencaRow[];
  projectId: string;
}

export default function MicrocuencaSelectionList({
  districtMicrocuencas,
  projectId,
}: MicrocuencaSelectionListProps) {
  const { selectedIds, toggle, clearSelection } = useAreaEstudioSelection();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedCount = selectedIds.size;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await saveAreaEstudioFromMicrocuencas(
        projectId,
        [...selectedIds],
      );
      if (!res.ok) {
        setError(res.message ?? "Error desconocido");
        return;
      }
      clearSelection();
      router.refresh();
    });
  }

  if (districtMicrocuencas.length === 0) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        No se encontraron microcuencas en el distrito del proyecto. Verifique que las capas de distritos y microcuencas estén cargadas en la base de datos.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Microcuencas del distrito
        </h3>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={clearSelection}
            className="text-xs text-stone-400 hover:text-stone-600 hover:underline"
          >
            Limpiar
          </button>
        )}
      </div>

      <p className="text-xs text-stone-500">
        Seleccione las microcuencas (UH Pfafstetter) que conforman el área de estudio. Puede hacer clic aquí o directamente sobre el mapa.
      </p>

      <ul className="max-h-60 divide-y divide-stone-100 overflow-y-auto rounded border border-stone-200 bg-white">
        {districtMicrocuencas.map((m) => {
          const isSelected = selectedIds.has(m.id);
          return (
            <li key={m.id}>
              <label className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-stone-50 ${isSelected ? "bg-sky-50" : ""}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="flex-1 min-w-0">
                  <span className={`block font-medium truncate ${isSelected ? "text-sky-900" : "text-stone-800"}`}>
                    {m.nombre ?? `UH ${m.pfafstetter}`}
                  </span>
                  <span className="block text-xs text-stone-400">
                    {m.pfafstetter} · Nivel {m.nivel}
                    {m.area_km2 != null ? ` · ${m.area_km2.toFixed(0)} km²` : ""}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending || selectedCount === 0}
          className="inline-flex items-center rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Guardando…"
            : selectedCount === 0
            ? "Confirmar selección"
            : `Confirmar selección (${selectedCount})`}
        </button>
        {selectedCount > 0 && !pending && (
          <span className="text-xs text-stone-500">
            {selectedCount} {selectedCount === 1 ? "microcuenca" : "microcuencas"} seleccionada{selectedCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          {error}
        </div>
      )}
    </div>
  );
}
