"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ActionResult,
  type DeriveOptions,
  type DeriveStrategy,
  enqueueDeriveAreaEstudio,
  enqueueProposeStations,
  enqueueUploadAreaEstudio,
} from "@/app/(app)/projects/[id]/actions";
import { createClient } from "@/lib/supabase/client";

interface AreaEstudioActionsProps {
  projectId: string;
  hasComponents: boolean;
  /** Gate the "propose stations" button on having an active polygon. */
  hasAreaEstudio: boolean;
  /** Current component count — used for auto-re-derive detection. */
  componentCount: number;
  /** Component count at last derivation (from inputs_snapshot). */
  lastDeriveComponentCount: number | null;
}

const DEFAULT_OPTIONS: Required<DeriveOptions> = {
  strategy: "subbasin_envelope",
  targetAreaHa: 2000,
  streamThresholdCells: 500,
  maxHops: 4,
  drainage: "local_dem",
  receptorBufferM: 1000,
  maxMicrocuencaAreaKm2: 2500,
  maxUpstreamKm: 5,
};

type JobStatus = "pending" | "running" | "completed" | "failed";
const POLL_INTERVAL_MS = 2_000;
const STUCK_AFTER_MS = 20_000;

interface JobView {
  id: string;
  status: JobStatus;
  error: string | null;
  result: Record<string, unknown> | null;
}

export default function AreaEstudioActions({
  projectId,
  hasComponents,
  hasAreaEstudio,
  componentCount,
  lastDeriveComponentCount,
}: AreaEstudioActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enqueueError, setEnqueueError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [opts, setOpts] = useState<Required<DeriveOptions>>(DEFAULT_OPTIONS);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-re-derive: components changed since last derivation.
  const needsReDerive =
    hasComponents &&
    lastDeriveComponentCount !== null &&
    componentCount !== lastDeriveComponentCount;

  function handleResult(res: ActionResult): void {
    if (!res.ok) {
      setEnqueueError(res.message ?? "Error desconocido");
      return;
    }
    setEnqueueError(null);
    if (res.jobId) setActiveJobId(res.jobId);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function runDerive(): void {
    setEnqueueError(null);
    startTransition(async () => {
      const res = await enqueueDeriveAreaEstudio(projectId, opts);
      handleResult(res);
    });
  }

  function runUpload(formData: FormData): void {
    setEnqueueError(null);
    startTransition(async () => {
      const res = await enqueueUploadAreaEstudio(projectId, formData);
      handleResult(res);
    });
  }

  function runProposeStations(): void {
    setEnqueueError(null);
    startTransition(async () => {
      const res = await enqueueProposeStations(projectId, {
        receptorBufferM: 5000,
        maxStationsPerKind: 6,
      });
      handleResult(res);
    });
  }

  return (
    <div className="space-y-4 rounded-md border border-stone-200 bg-stone-50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Generar o cargar
      </h3>

      {/* Generate */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runDerive}
            disabled={pending || !hasComponents || activeJobId !== null}
            className="inline-flex items-center rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Encolando…" : "Delimitar Microcuencas"}
          </button>
          <button
            type="button"
            onClick={() => setShowHowItWorks((s) => !s)}
            className="text-xs text-stone-500 hover:text-stone-900 underline-offset-2 hover:underline"
          >
            {showHowItWorks ? "Ocultar" : "Cómo funciona"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="text-xs text-stone-500 hover:text-stone-900 underline-offset-2 hover:underline"
          >
            {showAdvanced ? "Ocultar opciones" : "Opciones avanzadas"}
          </button>
          {!hasComponents && (
            <span className="text-xs text-amber-700">
              Sin componentes — primero subir RFI.
            </span>
          )}
          {needsReDerive && (
            <span className="text-xs text-sky-700">
              {componentCount} componentes ({lastDeriveComponentCount} en última derivación) — se recomienda volver a delimitar.
            </span>
          )}
        </div>

        {showHowItWorks && (
          <div className="rounded border border-stone-200 bg-white p-3 text-xs leading-relaxed text-stone-700 space-y-2">
            <p>
              <b>Estrategia Sub-cuencas</b> (por defecto):
            </p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>
                Se recorta el raster de dirección de flujo D8 (HydroSHEDS 90 m) al bounding box del proyecto + 15 km de contexto.
              </li>
              <li>
                Se extraen los cursos de agua con un umbral de acumulación de flujo ({opts.streamThresholdCells} celdas).
              </li>
              <li>
                Whitebox Tools genera sub-cuencas locales (unidades de drenaje entre confluencias).
              </li>
              <li>
                Se identifican las sub-cuencas que intersectan los componentes del proyecto (núcleo).
              </li>
              <li>
                Se expanden iterativamente a sub-cuencas vecinas hasta alcanzar el área objetivo ({opts.targetAreaHa} ha) o el máximo de saltos ({opts.maxHops}).
              </li>
              <li>
                La unión se simplifica y se proyecta a EPSG:4326. El borde resultante sigue divisorias de agua (ridgelines), no buffers circulares.
              </li>
            </ol>
            <p className="text-stone-500">
              <b>Legacy (Buffer + Drenaje)</b>: buffer perimetral + microcuencas Pfafstetter + cuenca aguas arriba del DEM. Más rápido pero menos preciso topográficamente.
            </p>
          </div>
        )}

        {showAdvanced && (
          <div className="space-y-2 text-xs">
            <label className="flex flex-col">
              <span className="text-stone-500">Estrategia</span>
              <select
                value={opts.strategy}
                onChange={(e) =>
                  setOpts((o) => ({
                    ...o,
                    strategy: e.target.value as DeriveStrategy,
                  }))
                }
                className="rounded border border-stone-300 bg-white px-2 py-1"
              >
                <option value="subbasin_envelope">
                  Sub-cuencas (sigue divisorias / curvas de nivel)
                </option>
                <option value="buffer_drainage">
                  Buffer + microcuencas + cuenca aguas arriba (legacy)
                </option>
              </select>
            </label>

            {opts.strategy === "subbasin_envelope" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <NumField
                  label="Área objetivo (ha)"
                  value={opts.targetAreaHa}
                  onChange={(v) => setOpts((o) => ({ ...o, targetAreaHa: v }))}
                />
                <NumField
                  label="Umbral de río (celdas)"
                  value={opts.streamThresholdCells}
                  onChange={(v) =>
                    setOpts((o) => ({ ...o, streamThresholdCells: Math.round(v) }))
                  }
                />
                <NumField
                  label="Saltos vecinos máx"
                  value={opts.maxHops}
                  onChange={(v) =>
                    setOpts((o) => ({ ...o, maxHops: Math.round(v) }))
                  }
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="flex flex-col">
                  <span className="text-stone-500">Drenaje DEM</span>
                  <select
                    value={opts.drainage}
                    onChange={(e) =>
                      setOpts((o) => ({
                        ...o,
                        drainage: e.target.value as "none" | "local_dem",
                      }))
                    }
                    className="rounded border border-stone-300 bg-white px-2 py-1"
                  >
                    <option value="local_dem">DEM local (HydroSHEDS)</option>
                    <option value="none">Sin drenaje DEM</option>
                  </select>
                </label>
                <NumField
                  label="Buffer receptor (m)"
                  value={opts.receptorBufferM}
                  onChange={(v) =>
                    setOpts((o) => ({ ...o, receptorBufferM: v }))
                  }
                />
                <NumField
                  label="Microcuenca máx (km²)"
                  value={opts.maxMicrocuencaAreaKm2}
                  onChange={(v) =>
                    setOpts((o) => ({ ...o, maxMicrocuencaAreaKm2: v }))
                  }
                />
                <NumField
                  label="Aguas arriba máx (km)"
                  value={opts.maxUpstreamKm}
                  onChange={(v) =>
                    setOpts((o) => ({ ...o, maxUpstreamKm: v }))
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Propose sampling stations */}
      <div className="space-y-2 border-t border-stone-200 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runProposeStations}
            disabled={pending || !hasAreaEstudio || activeJobId !== null}
            className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Encolando…" : "Proponer estaciones de muestreo"}
          </button>
          {!hasAreaEstudio && (
            <span className="text-xs text-amber-700">
              Generar área de estudio primero.
            </span>
          )}
          <span className="text-[10px] text-stone-500">
            Ancla aire / ruido / vibraciones a los receptores sensibles
            del INEI dentro del polígono.
          </span>
        </div>
      </div>

      {/* Upload */}
      <form
        action={runUpload}
        className="space-y-2 border-t border-stone-200 pt-3"
      >
        <p className="text-xs text-stone-500">
          O bien, cargar un polígono ya dibujado (KMZ, KML, SHP en .zip,
          GeoJSON, GPKG):
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            name="file"
            accept=".kmz,.kml,.shp,.zip,.geojson,.json,.gpkg"
            required
            className="block text-xs file:mr-2 file:rounded file:border-0 file:bg-stone-200 file:px-2 file:py-1 file:text-xs file:font-medium hover:file:bg-stone-300"
          />
          <input
            type="text"
            name="sourceCrs"
            placeholder="CRS opcional (e.g. EPSG:32718)"
            className="rounded border border-stone-300 bg-white px-2 py-1 text-xs"
            size={20}
          />
          <button
            type="submit"
            disabled={pending || activeJobId !== null}
            className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50"
          >
            {pending ? "Subiendo…" : "Cargar archivo"}
          </button>
        </div>
      </form>

      {enqueueError && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          <div className="font-semibold">Error encolando</div>
          <pre className="whitespace-pre-wrap font-mono text-[10px]">
            {enqueueError}
          </pre>
        </div>
      )}

      {activeJobId && (
        <JobStatusWatcher
          key={activeJobId}
          jobId={activeJobId}
          onDone={() => {
            setActiveJobId(null);
            router.refresh();
          }}
          onDismiss={() => setActiveJobId(null)}
        />
      )}
    </div>
  );
}

// ─── Status watcher ────────────────────────────────────────────────────

function JobStatusWatcher({
  jobId,
  onDone,
  onDismiss,
}: {
  jobId: string;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const [job, setJob] = useState<JobView | null>(null);
  const [stuck, setStuck] = useState(false);
  // Lazy initializer — React's purity rule blocks Date.now() at the
  // top of render. The component is remounted via `key={jobId}`, so
  // this is computed once per job watch.
  const [startedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function poll(): Promise<JobStatus | null> {
      const { data, error } = await supabase
        .from("derivation_jobs")
        .select("id, status, error, result")
        .eq("id", jobId)
        .single();
      if (error) {
        return null;
      }
      if (cancelled) return null;
      const status = data.status as JobStatus;
      setJob({
        id: data.id,
        status,
        error: data.error,
        result: data.result as Record<string, unknown> | null,
      });
      if (status === "pending" && Date.now() - startedAt > STUCK_AFTER_MS) {
        setStuck(true);
      }
      return status;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    async function loop() {
      const status = await poll();
      if (cancelled) return;
      if (status === "completed") {
        onDone();
        return;
      }
      if (status === "failed") {
        return;
      }
      timer = setTimeout(loop, POLL_INTERVAL_MS);
    }
    loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, onDone, startedAt]);

  if (!job) {
    return (
      <div className="rounded border border-stone-200 bg-white p-2 text-xs text-stone-700">
        Encolando trabajo…
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="space-y-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Trabajo falló</span>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] text-red-700 hover:underline"
          >
            cerrar
          </button>
        </div>
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
          {job.error || "Sin detalle de error."}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {job.status === "pending" ? "En cola" : "Procesando…"}
        </span>
        <span className="font-mono text-[10px] text-amber-700">{jobId.slice(0, 8)}</span>
      </div>
      {stuck && job.status === "pending" && (
        <p className="text-[11px] text-amber-800">
          Esperando que el worker procese. Si no tenés uno corriendo, ejecutá:
          <code className="mt-1 block rounded bg-stone-900 px-2 py-1 font-mono text-[10px] text-stone-100">
            python skills/reference-layers/scripts/worker.py
          </code>
        </p>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col">
      <span className="text-stone-500">{label}</span>
      <input
        type="number"
        min={0}
        step={0.1}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        className="rounded border border-stone-300 bg-white px-2 py-1"
      />
    </label>
  );
}
