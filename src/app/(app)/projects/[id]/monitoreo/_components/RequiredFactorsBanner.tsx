"use client";

import { useState, useTransition } from "react";
import type { FactorDef } from "@/lib/monitoreo/eca-registry";
import { enqueueProposeStations } from "@/app/(app)/projects/[id]/actions";

interface Props {
  projectId: string;
  /** Factors that are required="always" but currently have zero stations. */
  missingFactors: readonly FactorDef[];
}

/**
 * Top-of-monitoreo-hub callout: list factors required by every Cap 3 baseline
 * that still have zero stations, and offer a one-click action to enqueue
 * station proposals for the missing kinds via the existing worker.
 */
export default function RequiredFactorsBanner({ projectId, missingFactors }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (missingFactors.length === 0) return null;

  function handleAutoPropose() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await enqueueProposeStations(projectId, {
        onlyKinds: missingFactors.map((f) => f.id),
      });
      if (res.ok) {
        setMessage(
          `Generación encolada (job ${res.jobId?.slice(0, 8)}…). Las estaciones aparecerán abajo cuando el worker termine.`,
        );
      } else {
        setError(res.message ?? "No se pudo encolar la propuesta.");
      }
    });
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <span aria-hidden>⚠</span>
            <span>
              Faltan estaciones para {missingFactors.length}{" "}
              {missingFactors.length === 1 ? "factor requerido" : "factores requeridos"}{" "}
              por la Línea Base
            </span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5 text-xs text-red-900">
            {missingFactors.map((f) => (
              <li
                key={f.id}
                className="rounded-full border border-red-300 bg-white px-2 py-0.5"
                title={`${f.section} · ${f.decree}`}
              >
                {f.label}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-red-800/80">
            Cada factor requiere estaciones de muestreo y mediciones cargadas en este módulo
            antes de poder generar el Cap. 3 de la DIA.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAutoPropose}
          disabled={pending}
          className="shrink-0 rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Encolando…" : "Generar estaciones automáticamente"}
        </button>
      </div>
      {message && (
        <p className="mt-3 rounded-md bg-white/60 px-3 py-2 text-xs text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-red-800">
          Error: {error}
        </p>
      )}
    </div>
  );
}
