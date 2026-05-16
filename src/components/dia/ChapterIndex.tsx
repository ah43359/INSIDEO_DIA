"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DIA_CHAPTERS } from "@/lib/dia/chapters";
import {
  type ChapterDraftStatus,
  readChapterDraftStatus,
} from "@/lib/dia/framework/storage";
import {
  fromChapterExportV7,
  toChapterExportV7,
  type ChapterExportV7,
} from "@/lib/dia/framework/state";

interface ChapterIndexProps {
  projectId: string;
  projectName: string;
}

type GenerateState = "idle" | "generating" | "error";

export default function ChapterIndex({ projectId, projectName }: ChapterIndexProps) {
  const [statuses, setStatuses] = useState<Record<number, ChapterDraftStatus>>({});
  const [hydrated, setHydrated] = useState(false);
  const [generate, setGenerate] = useState<GenerateState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // SSR + localStorage hydration overlay: read draft statuses on the client
  // after mount. See Cap2Editor for the pattern rationale.
  useEffect(() => {
    const next: Record<number, ChapterDraftStatus> = {};
    for (const c of DIA_CHAPTERS) {
      next[c.id] = readChapterDraftStatus(c.id, projectId);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatuses(next);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [projectId]);

  async function handleGenerateAll(): Promise<void> {
    setGenerate("generating");
    setErrorMsg(null);
    try {
      const chapters: Record<number, ChapterExportV7> = {};
      for (const c of DIA_CHAPTERS) {
        if (c.status !== "editable") continue;
        const raw = window.localStorage.getItem(`dia:cap${c.id}:${projectId}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        // Re-export to canonical v7 shape (handles both Cap.2's legacy state and the framework's)
        try {
          chapters[c.id] = toChapterExportV7(fromChapterExportV7(wrapAsExportV7(parsed)));
        } catch {
          // Cap. 2 has its own schema with introType etc; fall back to whatever was saved
          chapters[c.id] = parsed;
        }
      }

      const response = await fetch(`/api/projects/${projectId}/dia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DIA_${projectName.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerate("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setGenerate("error");
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-stone-700">Capítulos de la DIA</h2>
          <p className="text-xs text-stone-500">
            7 capítulos según RM N° 108-2018-MEM/DM, Anexo I — Categoría I DIA.
          </p>
        </div>
        <button
          onClick={handleGenerateAll}
          disabled={generate === "generating"}
          className="rounded-md bg-stone-800 px-4 py-2 text-xs font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {generate === "generating" ? "Generando…" : "Generar DIA completa (.docx)"}
        </button>
      </div>

      {errorMsg && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Error: {errorMsg}</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2">
        {DIA_CHAPTERS.map((c) => {
          const status = statuses[c.id];
          const tag = !hydrated
            ? "—"
            : !status?.hasDraft
              ? "vacío"
              : status.filledFieldCount > 0
                ? `borrador (${status.filledFieldCount} campo(s))`
                : "borrador";
          const editable = c.status === "editable";
          return (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Capítulo {c.id}
                </p>
                <p className="truncate text-sm font-medium text-stone-800">{c.shortTitle}</p>
                <p className="text-xs text-stone-500">
                  {editable ? tag : "no implementado aún"}
                </p>
              </div>
              {editable ? (
                <Link
                  href={`/projects/${projectId}/dia/${c.id}`}
                  className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-100"
                >
                  Editar
                </Link>
              ) : (
                <Link
                  href={`/projects/${projectId}/dia/${c.id}`}
                  className="rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-400"
                >
                  Próximamente
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Cap. 2's saved state has an extra `introType` field and `utmZone`; the
// framework v7 schema doesn't include these. Wrap permissively so the
// re-export round-trips without losing data we don't recognise.
function wrapAsExportV7(parsed: unknown): unknown {
  if (!parsed || typeof parsed !== "object") return parsed;
  const p = parsed as Record<string, unknown>;
  if (p.version === 7) return p;
  return { version: 7, exportDate: new Date().toISOString(), ...p };
}
