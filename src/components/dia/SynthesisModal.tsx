"use client";

// Modal that previews AI-synthesized section content before the user
// accepts it. Each section shows its synthesized prose + citations to
// the approved DIA examples it was modeled on.

import { useState } from "react";

export interface SynthesisCitation {
  sourceFilename: string;
  projectName: string | null;
  instrumentType: string | null;
  sectionPath: string;
  similarity: number;
}

export interface SynthesisItem {
  sectionId: string;
  sectionTitle: string;
  content: string;
  citations: readonly SynthesisCitation[];
  /** True for parent (non-leaf) intro sections generated in phase 2. */
  isParent?: boolean;
}

interface SynthesisModalProps {
  open: boolean;
  items: readonly SynthesisItem[];
  errors: ReadonlyArray<{ sectionId: string; message: string }>;
  onAcceptAll: () => void;
  onAcceptOne: (sectionId: string) => void;
  onCancel: () => void;
  /** When true, content was auto-saved as it streamed in; modal is review-only. */
  autoApplied?: boolean;
  /** Called when user wants to discard all auto-saved content (revert). */
  onRevertAll?: () => void;
}

export default function SynthesisModal({
  open,
  items,
  errors,
  onAcceptAll,
  onAcceptOne,
  onCancel,
  autoApplied,
  onRevertAll,
}: SynthesisModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-800">
              {autoApplied ? "Contenido generado y guardado" : "Vista previa: contenido generado con IA"}
            </h2>
            <p className="mt-0.5 text-xs text-stone-500">
              {autoApplied
                ? `${items.length} sección${items.length === 1 ? "" : "es"} guardada${items.length === 1 ? "" : "s"} en el capítulo. Revisa y cierra, o revierta si no te convence.`
                : `${items.length} sección${items.length === 1 ? "" : "es"} sintetizada${items.length === 1 ? "" : "s"} a partir de DIAs aprobados.`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {errors.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">
                {errors.length} sección{errors.length === 1 ? "" : "es"} con error:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {errors.map((e) => (
                  <li key={e.sectionId}>
                    <span className="font-mono">{e.sectionId}</span>: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-stone-500">No se generó contenido nuevo.</p>
          ) : (
            items.map((item) => {
              const isExpanded = expandedId === item.sectionId;
              const preview = item.content.slice(0, 240);
              return (
                <article
                  key={item.sectionId}
                  className="rounded-lg border border-stone-200 bg-stone-50 p-3"
                >
                  <header className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-stone-400">{item.sectionId}</p>
                      <p className="truncate text-sm font-medium text-stone-800">
                        {item.sectionTitle}
                        {item.isParent && (
                          <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700">
                            Introducción
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.sectionId)
                        }
                        className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
                      >
                        {isExpanded ? "Colapsar" : "Ver completo"}
                      </button>
                      {autoApplied ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          ✓ Guardado
                        </span>
                      ) : (
                        <button
                          onClick={() => onAcceptOne(item.sectionId)}
                          className="rounded-md bg-stone-800 px-2 py-1 text-xs font-medium text-white hover:bg-stone-700"
                        >
                          Aceptar
                        </button>
                      )}
                    </div>
                  </header>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                    {isExpanded ? item.content : preview + (item.content.length > 240 ? "…" : "")}
                  </div>
                  {item.citations.length > 0 && (
                    <footer className="mt-2 border-t border-stone-200 pt-2 text-xs text-stone-500">
                      <p className="mb-1 font-semibold uppercase tracking-wide">
                        Adaptado de:
                      </p>
                      <ul className="space-y-0.5">
                        {item.citations.map((c, i) => (
                          <li key={i}>
                            {c.instrumentType ?? "DIA"} {c.projectName ?? "—"} ·{" "}
                            <span className="font-mono">{c.sectionPath}</span> ·{" "}
                            similitud {(c.similarity * 100).toFixed(0)}%
                          </li>
                        ))}
                      </ul>
                    </footer>
                  )}
                </article>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-5 py-3">
          {autoApplied ? (
            <>
              {onRevertAll && (
                <button
                  onClick={onRevertAll}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                >
                  Revertir todo
                </button>
              )}
              <button
                onClick={onAcceptAll}
                className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onCancel}
                className="rounded-md border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
              >
                Cancelar
              </button>
              {items.length > 0 && (
                <button
                  onClick={onAcceptAll}
                  className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
                >
                  Aceptar todas ({items.length})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
