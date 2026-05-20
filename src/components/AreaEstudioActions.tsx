"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type ActionResult,
  enqueueUploadAreaEstudio,
  enqueueProposeStations,
} from "@/app/(app)/projects/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";

interface AreaEstudioActionsProps {
  projectId: string;
  /** Gate the "propose stations" button on having an active polygon. */
  hasAreaEstudio: boolean;
}

type JobStatus = "pending" | "running" | "completed" | "failed";
const POLL_INTERVAL_MS = 2_000;

interface JobView {
  id: string;
  status: JobStatus;
  error: string | null;
  result: Record<string, unknown> | null;
}

export default function AreaEstudioActions({
  projectId,
  hasAreaEstudio,
}: AreaEstudioActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enqueueError, setEnqueueError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleResult(res: ActionResult): void {
    if (!res.ok) {
      setEnqueueError(res.message ?? "Error desconocido");
      return;
    }
    setEnqueueError(null);
    if (res.jobId) setActiveJobId(res.jobId);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
      {/* Propose sampling stations */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Estaciones de muestreo
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runProposeStations}
            disabled={pending || !hasAreaEstudio}
            className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pending ? "Encolando…" : "Proponer estaciones de muestreo"}
          </button>
          {!hasAreaEstudio && (
            <span className="text-xs text-amber-700">
              Confirme el área de estudio primero.
            </span>
          )}
          <span className="text-[10px] text-stone-500">
            Ancla aire / ruido / vibraciones a los receptores sensibles del INEI dentro del polígono.
          </span>
        </div>
      </div>

      {/* Upload */}
      <form
        action={runUpload}
        className="space-y-2 border-t border-stone-200 pt-3"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Cargar polígono propio
        </h3>
        <p className="text-xs text-stone-500">
          Si ya tiene un polígono dibujado (KMZ, KML, SHP en .zip, GeoJSON, GPKG):
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
            disabled={pending}
            className="inline-flex items-center rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm hover:bg-stone-100 disabled:opacity-50"
          >
            {pending ? "Subiendo…" : "Cargar archivo"}
          </button>
        </div>
      </form>

      {enqueueError && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          <div className="font-semibold">Error</div>
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
  const doneCalledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    function applyRow(row: {
      id: string;
      status: string;
      error: string | null;
      result: unknown;
    }) {
      if (cancelled) return;
      const status = row.status as JobStatus;
      setJob({
        id: row.id,
        status,
        error: row.error,
        result: row.result as Record<string, unknown> | null,
      });
      if (status === "completed" && !doneCalledRef.current) {
        doneCalledRef.current = true;
        onDone();
      }
    }

    const channel = supabase
      .channel(`job-status-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "derivation_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => applyRow(payload.new as Parameters<typeof applyRow>[0]),
      )
      .subscribe();

    let timer: ReturnType<typeof setTimeout> | null = null;
    async function poll() {
      const { data, error } = await supabase
        .from("derivation_jobs")
        .select("id, status, error, result")
        .eq("id", jobId)
        .single();
      if (error || cancelled) return;
      applyRow(data);
      if (data.status === "completed" || data.status === "failed") return;
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }
    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [jobId, onDone]);

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
          <button type="button" onClick={onDismiss} className="text-[10px] text-red-700 hover:underline">
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
    <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
      <span className="font-semibold">
        {job.status === "pending" ? "En cola" : "Procesando…"}
      </span>
      <span className="ml-2 font-mono text-[10px] text-amber-700">{jobId.slice(0, 8)}</span>
    </div>
  );
}
