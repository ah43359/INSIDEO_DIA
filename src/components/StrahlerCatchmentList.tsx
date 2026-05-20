"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStrahlerCatchmentSelection } from "@/context/StrahlerCatchmentContext";
import { saveAreaEstudioFromStrahlerCatchments } from "@/app/(app)/projects/[id]/actions";
import type { StrahlerCatchmentRow } from "@/lib/types";

interface Props {
  catchments: StrahlerCatchmentRow[];
  projectId: string;
}

export default function StrahlerCatchmentList({ catchments, projectId }: Props) {
  const { selectedIds, toggle, clearSelection } = useStrahlerCatchmentSelection();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const selectedCount = selectedIds.size;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await saveAreaEstudioFromStrahlerCatchments(
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

  if (catchments.length === 0) {
    return (
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        No se encontraron cuencas Strahler ≥ 2 en los distritos del proyecto.
        Verifique que los ríos y microcuencas estén ingestados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Cuencas hidrográficas (Strahler ≥ 2)
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
        Seleccione las cuencas que conformarán el área de estudio. Puede hacer
        clic aquí o directamente sobre el mapa.
      </p>

      <ul className="max-h-60 divide-y divide-stone-100 overflow-y-auto rounded border border-stone-200 bg-white">
        {catchments.map((c) => {
          const isSelected = selectedIds.has(c.id);
          return (
            <li key={c.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-stone-50 ${
                  isSelected ? "bg-teal-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate font-medium ${
                      isSelected ? "text-teal-900" : "text-stone-800"
                    }`}
                  >
                    {c.nombre ?? `Cuenca ${c.pfafstetter}`}
                  </span>
                  <span className="block text-xs text-stone-400">
                    {c.pfafstetter}
                    {c.area_km2 != null
                      ? ` · ${c.area_km2.toFixed(0)} km²`
                      : ""}
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
          className="inline-flex items-center rounded-md bg-teal-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Guardando…"
            : selectedCount === 0
              ? "Confirmar selección"
              : `Confirmar selección (${selectedCount})`}
        </button>
        {selectedCount > 0 && !pending && (
          <span className="text-xs text-stone-500">
            {selectedCount}{" "}
            {selectedCount === 1 ? "cuenca seleccionada" : "cuencas seleccionadas"}
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
