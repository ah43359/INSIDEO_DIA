"use client";

import { useState } from "react";

interface ReportesPanelProps {
  projectId: string;
  projectName: string;
}

type GenerateState = "idle" | "capturing" | "generating" | "error";

async function captureMapScreenshot(): Promise<string | null> {
  // MapLibre renders to a WebGL canvas; preserveDrawingBuffer must be true
  // (set in ProjectMap.tsx) for toDataURL to return actual pixels.
  const canvas = document.querySelector<HTMLCanvasElement>(".maplibregl-canvas");
  if (!canvas) return null;
  try {
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export default function ReportesPanel({ projectId, projectName }: ReportesPanelProps) {
  const [state, setState] = useState<GenerateState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleGeneratePdt() {
    setState("capturing");
    setError(null);

    const mapImageDataUrl = await captureMapScreenshot();

    setState("generating");

    try {
      const response = await fetch(`/api/projects/${projectId}/pdt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapImageDataUrl }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PdT_${projectName.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setState("error");
    }
  }

  const isLoading = state === "capturing" || state === "generating";

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-stone-700">Reportes</h2>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-stone-800">Plan de Trabajo</p>
            <p className="text-xs text-stone-500">
              Línea base socio ambiental · DIA Exploración
            </p>
          </div>
          <button
            onClick={handleGeneratePdt}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                {state === "capturing" ? "Capturando mapa…" : "Generando…"}
              </>
            ) : (
              <>
                <svg
                  aria-hidden
                  className="h-3 w-3"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1a.75.75 0 0 1 .75.75v6.69l1.97-1.97a.75.75 0 1 1 1.06 1.06L8 11.31 4.22 7.53a.75.75 0 1 1 1.06-1.06L7.25 8.44V1.75A.75.75 0 0 1 8 1ZM1.5 13.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Z" />
                </svg>
                Generar .docx
              </>
            )}
          </button>
        </div>

        {state === "error" && error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            Error: {error}
          </p>
        )}

        <p className="text-xs text-stone-400">
          El documento incluye el mapa actual del proyecto como figura de referencia.
          Las estaciones de flora/fauna e hidrobiología se generan como tablas vacías (por completar).
        </p>
      </div>
    </section>
  );
}
