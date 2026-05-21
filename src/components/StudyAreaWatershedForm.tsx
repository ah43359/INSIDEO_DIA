"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { enqueueRiverCorridorStudyArea } from "@/app/(app)/projects/[id]/actions";

interface Props {
  projectId: string;
  /** Initial value (m). Defaults to 2000 if no prior run. */
  defaultMinUpstreamM?: number | null;
  /** Initial value (m). Defaults to 5000 if no prior run. */
  defaultMinDownstreamM?: number | null;
  /** Initial corridor width (m). Defaults to 1000. */
  defaultCorridorWidthM?: number | null;
}

const DEFAULT_CORRIDOR_WIDTH_M = 1000;

/**
 * Form for recomputing the área de estudio as a buffered corridor along the
 * project's receiving river, bounded by the upstream and downstream control
 * points. Three inputs:
 *  - Aguas arriba (m): min distance the upstream CP must lie past the AE
 *  - Aguas abajo (m): min distance the downstream CP must lie past the AE
 *  - Ancho del corredor (m): buffer width on each side of the receiving river
 *
 * On submit, enqueues a `river_corridor` job in `derivation_jobs`; the local
 * worker picks it up and runs `compute_river_corridor_study_area.py`.
 */
export default function StudyAreaWatershedForm({
  projectId,
  defaultMinUpstreamM,
  defaultMinDownstreamM,
  defaultCorridorWidthM,
}: Props) {
  const [upstream, setUpstream] = useState<number>(
    Math.round(defaultMinUpstreamM ?? 2000),
  );
  const [downstream, setDownstream] = useState<number>(
    Math.round(defaultMinDownstreamM ?? 5000),
  );
  const [corridor, setCorridor] = useState<number>(
    Math.round(defaultCorridorWidthM ?? DEFAULT_CORRIDOR_WIDTH_M),
  );
  const [pending, startTransition] = useTransition();
  const [submittedJobId, setSubmittedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await enqueueRiverCorridorStudyArea(projectId, {
        minUpstreamM: upstream,
        minDownstreamM: downstream,
        corridorWidthM: corridor,
      });
      if (!res.ok) {
        setError(res.message ?? "No se pudo encolar el cálculo.");
        return;
      }
      setSubmittedJobId(res.jobId ?? null);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2.5"
    >
      <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-600">
        Corredor del río receptor
      </h4>
      <p className="mt-1 text-xs text-stone-500">
        Define el área de estudio como un corredor (buffer en ambos lados) a lo
        largo del río receptor, entre los puntos de control aguas arriba y
        aguas abajo. Excluye por construcción tributarios laterales fuera del
        corredor.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
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
        <label className="block text-xs text-stone-600">
          <span className="block">Ancho corredor (m)</span>
          <input
            type="number"
            inputMode="numeric"
            min={200}
            max={5000}
            step={100}
            value={corridor}
            onChange={(e) => setCorridor(Number(e.target.value) || 0)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm tabular-nums focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-50"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Encolando…" : "Recalcular corredor"}
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
