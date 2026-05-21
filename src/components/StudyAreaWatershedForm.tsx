"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  enqueueRiverCorridorStudyArea,
  type AreaEstudioStrategy,
} from "@/app/(app)/projects/[id]/actions";
import type { ExcludableTributaryRow } from "@/lib/types";

interface Props {
  projectId: string;
  /** Initial value (m). Defaults to 2000 if no prior run. */
  defaultMinUpstreamM?: number | null;
  /** Initial value (m). Defaults to 5000 if no prior run. */
  defaultMinDownstreamM?: number | null;
  /** Initial trunk-buffer (m). Defaults to 150. */
  defaultTrunkBufferM?: number | null;
  /** Initial corridor width (m). Defaults to 1000. */
  defaultCorridorWidthM?: number | null;
  /** Initial strategy. Defaults to "watershed". */
  defaultStrategy?: AreaEstudioStrategy | null;
  /** Named tributaries inside the current AE that the user can opt to exclude. */
  excludableTributaries: ExcludableTributaryRow[];
  /** IDs currently excluded by the persisted AE row (so the checkboxes
   *  start in the right state). */
  initialExcludedIds?: number[];
}

const DEFAULT_TRUNK_BUFFER_M = 150;
const DEFAULT_CORRIDOR_WIDTH_M = 1000;

/**
 * Form for recomputing the área de estudio.  User picks the strategy:
 *
 *   - Cuenca con exclusiones (watershed) — between-CPs catchment minus
 *     user-selected tributaries.  Respects real watershed divides.
 *   - Corredor del río receptor (corridor) — buffered receiving-river
 *     path + project anchor.  Tighter and simpler, ignores divides.
 */
export default function StudyAreaWatershedForm({
  projectId,
  defaultMinUpstreamM,
  defaultMinDownstreamM,
  defaultTrunkBufferM,
  defaultCorridorWidthM,
  defaultStrategy,
  excludableTributaries,
  initialExcludedIds,
}: Props) {
  const [strategy, setStrategy] = useState<AreaEstudioStrategy>(
    defaultStrategy ?? "watershed",
  );
  const [upstream, setUpstream] = useState<number>(
    Math.round(defaultMinUpstreamM ?? 2000),
  );
  const [downstream, setDownstream] = useState<number>(
    Math.round(defaultMinDownstreamM ?? 5000),
  );
  const [trunkBuffer, setTrunkBuffer] = useState<number>(
    Math.round(defaultTrunkBufferM ?? DEFAULT_TRUNK_BUFFER_M),
  );
  const [corridorWidth, setCorridorWidth] = useState<number>(
    Math.round(defaultCorridorWidthM ?? DEFAULT_CORRIDOR_WIDTH_M),
  );
  const [excludedIds, setExcludedIds] = useState<Set<number>>(
    () => new Set(initialExcludedIds ?? []),
  );
  const [pending, startTransition] = useTransition();
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const sortedTributaries = useMemo(() => {
    return [...excludableTributaries].sort((a, b) => b.length_km - a.length_km);
  }, [excludableTributaries]);

  function toggleExclusion(id: number): void {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await enqueueRiverCorridorStudyArea(projectId, {
        strategy,
        minUpstreamM: upstream,
        minDownstreamM: downstream,
        trunkBufferM: trunkBuffer,
        corridorWidthM: corridorWidth,
        excludedTributaryIds: [...excludedIds],
      });
      if (!res.ok) {
        setError(res.message ?? "No se pudo encolar el cálculo.");
        return;
      }
      setSubmittedJobId(res.jobId ?? null);
      router.refresh();
    });
  }

  const excludedCount = excludedIds.size;
  const isWatershed = strategy === "watershed";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2.5"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
        Calcular área de estudio
      </h4>

      {/* Strategy picker */}
      <fieldset className="mt-2.5">
        <legend className="sr-only">Estrategia de cálculo</legend>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2 text-xs ${
              isWatershed
                ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                : "border-stone-200 bg-white hover:bg-stone-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="strategy"
                value="watershed"
                checked={isWatershed}
                onChange={() => setStrategy("watershed")}
                disabled={pending}
                className="h-3.5 w-3.5 border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-semibold text-stone-800">
                Cuenca con exclusiones
              </span>
            </span>
            <span className="text-stone-500">
              Cuenca de drenaje completa entre los puntos de control. Marque
              tributarios para sustraer sus cuencas. Respeta divisorias reales.
            </span>
          </label>
          <label
            className={`flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2 text-xs ${
              !isWatershed
                ? "border-teal-500 bg-teal-50/60 ring-1 ring-teal-500"
                : "border-stone-200 bg-white hover:bg-stone-50"
            }`}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="strategy"
                value="corridor"
                checked={!isWatershed}
                onChange={() => setStrategy("corridor")}
                disabled={pending}
                className="h-3.5 w-3.5 border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="font-semibold text-stone-800">
                Corredor del río receptor
              </span>
            </span>
            <span className="text-stone-500">
              Buffer a lo largo del río receptor (US → DS) más un anclaje
              alrededor del proyecto. Más compacto, no sigue divisorias.
            </span>
          </label>
        </div>
      </fieldset>

      {/* Common inputs */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
        <label className="block text-xs text-stone-600">
          <span className="block">Aguas arriba (m)</span>
          <input
            type="number"
            inputMode="numeric"
            min={500}
            max={50000}
            step={500}
            value={upstream}
            onChange={(e) => setUpstream(Number(e.target.value) || 0)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
          />
        </label>
        <label className="block text-xs text-stone-600">
          <span className="block">Aguas abajo (m)</span>
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            max={100000}
            step={500}
            value={downstream}
            onChange={(e) => setDownstream(Number(e.target.value) || 0)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
        </label>
        {isWatershed ? (
          <label
            className="block text-xs text-stone-600"
            title="Buffer alrededor del río principal que la sustracción de tributarios no puede cruzar (previene fugas a la cuenca alta del río receptor)."
          >
            <span className="block">Buffer río principal (m)</span>
            <input
              type="number"
              inputMode="numeric"
              min={30}
              max={500}
              step={30}
              value={trunkBuffer}
              onChange={(e) => setTrunkBuffer(Number(e.target.value) || 0)}
              disabled={pending}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
            />
          </label>
        ) : (
          <label className="block text-xs text-stone-600">
            <span className="block">Ancho corredor (m)</span>
            <input
              type="number"
              inputMode="numeric"
              min={200}
              max={5000}
              step={100}
              value={corridorWidth}
              onChange={(e) => setCorridorWidth(Number(e.target.value) || 0)}
              disabled={pending}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
            />
          </label>
        )}
      </div>

      {/* Tributary exclusions (watershed strategy only) */}
      {isWatershed && sortedTributaries.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-600">
              Tributarios excluibles{" "}
              <span className="ml-1 text-stone-400 normal-case">
                ({sortedTributaries.length} en la cuenca)
              </span>
            </span>
            {excludedCount > 0 && (
              <button
                type="button"
                onClick={() => setExcludedIds(new Set())}
                className="text-xs text-stone-400 hover:text-stone-600 hover:underline"
                disabled={pending}
              >
                Limpiar ({excludedCount})
              </button>
            )}
          </div>
          <p className="mb-2 text-xs text-stone-500">
            Cada río listado abajo está dentro de la cuenca actual. Si se
            marca, se sustrae su cuenca aguas arriba antes de guardar.
          </p>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded border border-stone-200 bg-white p-1.5">
            {sortedTributaries.map((t) => {
              const checked = excludedIds.has(t.id);
              return (
                <li key={t.id}>
                  <label
                    className={`flex cursor-pointer items-baseline gap-2 rounded px-2 py-1 text-xs hover:bg-stone-50 ${
                      checked ? "bg-rose-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleExclusion(t.id)}
                      disabled={pending}
                      className="h-3.5 w-3.5 rounded border-stone-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span
                      className={`min-w-0 flex-1 truncate font-medium ${
                        checked ? "text-rose-900 line-through" : "text-stone-800"
                      }`}
                    >
                      {t.nombre}
                    </span>
                    <span className="text-stone-400 tabular-nums">
                      {t.strahler_order != null ? `S${t.strahler_order}` : "—"}
                      {" · "}
                      {t.length_km.toFixed(1)} km
                      {t.segments > 1 && ` · ${t.segments} segs`}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending
            ? "Encolando…"
            : isWatershed
              ? excludedCount > 0
                ? `Recalcular cuenca (excluir ${excludedCount})`
                : "Recalcular cuenca"
              : "Recalcular corredor"}
        </button>
        {submittedJobId && (
          <span className="text-xs text-stone-500">
            Job <code className="font-mono text-[10px]">{submittedJobId.slice(0, 8)}</code> en cola — el worker procesará y la página recargará al terminar.
          </span>
        )}
      </div>
      {error && (
        <div className="mt-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          {error}
        </div>
      )}
    </form>
  );
}
