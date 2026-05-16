"use client";

// Generic chapter editor used by Cap. 1 (Resumen Ejecutivo) and any
// future chapter that doesn't need a custom intro panel (Caps 4, 5, 7).
//
// Cap. 2 keeps its bespoke editor at src/components/cap2/Cap2Editor.tsx
// for now because of its UTM zone selector + basin auto-detect UI.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type DgField,
  findSection,
  type SectionNode,
} from "@/lib/dia/framework/manifest";
import {
  type ChapterFields,
  type ChapterState,
  fromChapterExportV7,
  toChapterExportV7,
} from "@/lib/dia/framework/state";
import {
  loadChapterState,
  saveChapterState,
} from "@/lib/dia/framework/storage";
import type { ChapterId } from "@/lib/dia/framework/manifest";
import SynthesisModal, {
  type SynthesisItem,
} from "@/components/dia/SynthesisModal";

export interface ChapterEditorProps {
  chapterId: ChapterId;
  chapterTitle: string;
  projectId: string;
  projectName: string;
  prefill: ChapterState;
  warnings: readonly string[];
  sections: readonly SectionNode[];
  dgGroups: Readonly<Record<string, readonly DgField[]>>;
  /** First section opened by default (e.g. "1.0" or "2.1"). */
  initialActiveId: string;
  /** Section ids whose subtree starts expanded. */
  initiallyOpenIds: readonly string[];
  /** Optional one-shot migration applied after loading from localStorage
   *  (e.g. Cap. 6 v1 → v2 schema migration). */
  migrate?: (state: ChapterState) => ChapterState;
}

type GenerateState = "idle" | "generating" | "error";
type SynthesisState = "idle" | "synthesizing" | "previewing" | "error";

/** Chapters where the "Generar con IA" RAG button is enabled. Driven by
 *  whether the corpus has been indexed for that chapter — currently
 *  only Cap. 6 (Plan de Manejo Ambiental) has approved DIAs in the
 *  E:/Architecture/DIA Examples/Cap6 folder. */
const RAG_ENABLED_CHAPTERS: ReadonlySet<ChapterId> = new Set([6]);

export default function ChapterEditor({
  chapterId,
  chapterTitle,
  projectId,
  projectName,
  prefill,
  warnings,
  sections,
  dgGroups,
  initialActiveId,
  initiallyOpenIds,
  migrate,
}: ChapterEditorProps) {
  const [state, setState] = useState<ChapterState>(prefill);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string>(initialActiveId);
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(initiallyOpenIds));
  const [generate, setGenerate] = useState<GenerateState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // RAG synthesis state
  const [synthState, setSynthState] = useState<SynthesisState>("idle");
  const [synthItems, setSynthItems] = useState<SynthesisItem[]>([]);
  const [synthErrors, setSynthErrors] = useState<Array<{ sectionId: string; message: string }>>([]);
  const ragEnabled = RAG_ENABLED_CHAPTERS.has(chapterId);

  // SSR + localStorage hydration overlay — see Cap2Editor for the rationale.
  useEffect(() => {
    const loaded = loadChapterState(chapterId, projectId, prefill);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(migrate ? migrate(loaded) : loaded);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [chapterId, projectId, prefill, migrate]);

  useEffect(() => {
    if (!hydrated) return;
    saveChapterState(chapterId, projectId, state);
  }, [state, chapterId, projectId, hydrated]);

  const activeSection = useMemo(() => findSection(activeId, sections), [activeId, sections]);

  function setDgField(key: string, value: string): void {
    setState((s) => ({ ...s, dgFields: { ...s.dgFields, [key]: value } }));
  }
  function setContent(id: string, value: string): void {
    setState((s) => ({ ...s, content: { ...s.content, [id]: value } }));
  }
  function toggleOpen(id: string): void {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleExportJson(): void {
    const payload = toChapterExportV7(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cap${chapterId}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashNotice("JSON exportado");
  }

  function handleImportFile(ev: React.ChangeEvent<HTMLInputElement>): void {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result ?? ""));
        const imported = fromChapterExportV7(parsed);
        setState(imported);
        flashNotice("JSON importado");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Error al leer el archivo JSON");
      }
    };
    reader.readAsText(file);
    ev.target.value = "";
  }

  async function handleGenerate(): Promise<void> {
    setGenerate("generating");
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/dia/${chapterId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toChapterExportV7(state)),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cap${chapterId}_${chapterTitle.replace(/\s+/g, "_")}_${projectName.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setGenerate("idle");
      flashNotice("Documento Word generado");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setGenerate("error");
    }
  }

  function flashNotice(msg: string): void {
    setNotification(msg);
    window.setTimeout(() => setNotification(null), 2200);
  }

  /** Collect all sections (leaves) that should be sent to the synthesis
   *  endpoint. We include any leaf that doesn't already have user-typed
   *  free-text in state.content[sectionId]. The user can re-run after
   *  editing to refresh other sections too. */
  function leavesToSynthesize(): Array<{ sectionId: string; sectionTitle: string; userFields: ChapterFields }> {
    const out: Array<{ sectionId: string; sectionTitle: string; userFields: ChapterFields }> = [];
    function walk(nodes: readonly SectionNode[]): void {
      for (const node of nodes) {
        const isLeaf = node.children.length === 0;
        if (isLeaf) {
          const hasContent = !!state.content[node.id]?.trim();
          if (!hasContent) {
            // Collect user fields for this section's structured group, if any
            const userFields: ChapterFields = {};
            if (node.structuredType) {
              const fs = dgGroups[node.structuredType];
              if (fs) {
                for (const f of fs) {
                  const v = state.dgFields[f.key];
                  if (v && v.trim()) userFields[f.key] = v;
                }
              }
            }
            out.push({ sectionId: node.id, sectionTitle: node.title, userFields });
          }
        } else {
          walk(node.children);
        }
      }
    }
    walk(sections);
    // Cap to 50 sections (matches API limit)
    return out.slice(0, 50);
  }

  async function handleSynthesize(): Promise<void> {
    const targets = leavesToSynthesize();
    if (targets.length === 0) {
      flashNotice("Todas las secciones ya tienen contenido. Limpia alguna para volver a sintetizar.");
      return;
    }
    setSynthState("synthesizing");
    setErrorMsg(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/dia/${chapterId}/synthesize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: targets }),
        },
      );
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        const detail = (errBody as { error?: string; detail?: string }).error
          ?? (errBody as { error?: string; detail?: string }).detail
          ?? `Error ${response.status}`;
        throw new Error(detail);
      }
      const json = (await response.json()) as {
        results: Array<{
          sectionId: string;
          content: string;
          citations: SynthesisItem["citations"];
          passagesRetrieved: number;
        }>;
        errors: Array<{ sectionId: string; message: string }>;
      };
      // Map results back to titles
      const titleById = new Map(targets.map((t) => [t.sectionId, t.sectionTitle]));
      const items: SynthesisItem[] = json.results.map((r) => ({
        sectionId: r.sectionId,
        sectionTitle: titleById.get(r.sectionId) ?? r.sectionId,
        content: r.content,
        citations: r.citations,
      }));
      setSynthItems(items);
      setSynthErrors(json.errors);
      setSynthState("previewing");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error desconocido");
      setSynthState("error");
    }
  }

  function acceptSynthesis(sectionIds: readonly string[]): void {
    setState((s) => {
      const nextContent = { ...s.content };
      for (const sid of sectionIds) {
        const item = synthItems.find((it) => it.sectionId === sid);
        if (item) nextContent[sid] = item.content;
      }
      return { ...s, content: nextContent };
    });
    setSynthState("idle");
    setSynthItems([]);
    setSynthErrors([]);
    flashNotice(`Aplicado a ${sectionIds.length} sección(es). Recuerda generar el Word para verlo.`);
  }

  const fields = activeSection?.structuredType ? dgGroups[activeSection.structuredType] : undefined;

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-[260px_1fr] gap-4 px-6 py-4">
      <aside className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3">
          <button
            onClick={handleGenerate}
            disabled={generate === "generating"}
            className="flex items-center justify-center gap-2 rounded-md bg-stone-800 px-3 py-2 text-xs font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {generate === "generating" ? (
              <>
                <span aria-hidden className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generando…
              </>
            ) : (
              "Generar Word"
            )}
          </button>
          {ragEnabled && (
            <button
              onClick={handleSynthesize}
              disabled={synthState === "synthesizing"}
              className="flex items-center justify-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50"
              title="Rellena las secciones vacías usando ejemplos aprobados de DIAs anteriores"
            >
              {synthState === "synthesizing" ? (
                <>
                  <span aria-hidden className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  Sintetizando…
                </>
              ) : (
                <>✨ Generar con IA</>
              )}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="flex-1 rounded-md border border-stone-200 px-2 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Exp JSON
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 rounded-md border border-stone-200 px-2 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Imp JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        <nav className="rounded-lg border border-stone-200 bg-white p-2">
          <SectionTree
            nodes={sections}
            activeId={activeId}
            openIds={openIds}
            onSelect={setActiveId}
            onToggle={toggleOpen}
            content={state.content}
          />
        </nav>
      </aside>

      <main className="flex flex-col gap-4">
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="mb-1 font-semibold">Advertencias del prellenado automático:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {notification && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notification}</div>
        )}
        {errorMsg && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Error: {errorMsg}</div>
        )}

        {activeSection && fields && fields.length > 0 ? (
          <StructuredPanel
            section={activeSection}
            fields={fields}
            dgFields={state.dgFields}
            content={state.content}
            onDgFieldChange={setDgField}
            onContentChange={setContent}
          />
        ) : activeSection ? (
          <FreeTextPanel
            section={activeSection}
            value={state.content[activeSection.id] ?? ""}
            onChange={(v) => setContent(activeSection.id, v)}
          />
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500">
            Selecciona una sección.
          </div>
        )}
      </main>

      <SynthesisModal
        open={synthState === "previewing"}
        items={synthItems}
        errors={synthErrors}
        onAcceptAll={() => acceptSynthesis(synthItems.map((i) => i.sectionId))}
        onAcceptOne={(sid) => acceptSynthesis([sid])}
        onCancel={() => {
          setSynthState("idle");
          setSynthItems([]);
          setSynthErrors([]);
        }}
      />
    </div>
  );
}

// ─── Section tree ─────────────────────────────────────────────────────

interface SectionTreeProps {
  nodes: readonly SectionNode[];
  activeId: string;
  openIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  content: ChapterFields;
}

function SectionTree({ nodes, activeId, openIds, onSelect, onToggle, content }: SectionTreeProps) {
  return (
    <ul className="text-xs">
      {nodes.map((node) => (
        <SectionTreeNode
          key={node.id}
          node={node}
          activeId={activeId}
          openIds={openIds}
          onSelect={onSelect}
          onToggle={onToggle}
          content={content}
        />
      ))}
    </ul>
  );
}

interface SectionTreeNodeProps extends Omit<SectionTreeProps, "nodes"> {
  node: SectionNode;
}

function SectionTreeNode({
  node,
  activeId,
  openIds,
  onSelect,
  onToggle,
  content,
}: SectionTreeNodeProps) {
  const isActive = activeId === node.id;
  const isOpen = openIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const indent = { paddingLeft: `${node.level * 10 + 6}px` };
  const filled = !!content[node.id]?.trim();

  return (
    <li>
      <div
        style={indent}
        className={`flex items-center gap-1 rounded py-1 pr-2 ${
          isActive ? "bg-stone-800 text-white" : "text-stone-700 hover:bg-stone-100"
        }`}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            className={`flex h-4 w-4 items-center justify-center rounded ${isActive ? "text-stone-200 hover:bg-stone-700" : "text-stone-400 hover:bg-stone-200"}`}
            aria-label={isOpen ? "Colapsar" : "Expandir"}
          >
            {isOpen ? "−" : "+"}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <button onClick={() => onSelect(node.id)} className="flex-1 truncate text-left">
          {node.title}
        </button>
        {filled && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="completado" />}
      </div>
      {hasChildren && isOpen && (
        <ul>
          {node.children.map((child) => (
            <SectionTreeNode
              key={child.id}
              node={child}
              activeId={activeId}
              openIds={openIds}
              onSelect={onSelect}
              onToggle={onToggle}
              content={content}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ─── Structured fields panel ──────────────────────────────────────────

interface StructuredPanelProps {
  section: SectionNode;
  fields: readonly DgField[];
  dgFields: ChapterFields;
  content: ChapterFields;
  onDgFieldChange: (key: string, value: string) => void;
  onContentChange: (id: string, value: string) => void;
}

function StructuredPanel({
  section,
  fields,
  dgFields,
  content,
  onDgFieldChange,
  onContentChange,
}: StructuredPanelProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          {section.title} · campos
        </h2>
        <div className="grid gap-2">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="mb-0.5 block text-xs font-medium text-stone-600">{f.label}</label>
              {f.multiline ? (
                <textarea
                  className="min-h-20 w-full resize-y rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
                  placeholder={f.placeholder}
                  value={dgFields[f.key] ?? ""}
                  onChange={(e) => onDgFieldChange(f.key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
                  placeholder={f.placeholder}
                  value={dgFields[f.key] ?? ""}
                  onChange={(e) => onDgFieldChange(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      </section>
      <FreeTextPanel
        section={section}
        value={content[section.id] ?? ""}
        onChange={(v) => onContentChange(section.id, v)}
        compact
      />
    </div>
  );
}

interface FreeTextPanelProps {
  section: SectionNode;
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}

function FreeTextPanel({ section, value, onChange, compact }: FreeTextPanelProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {compact ? "Texto adicional" : section.title}
        </h2>
        {value.trim() && (
          <button onClick={() => onChange("")} className="text-xs text-red-400 hover:text-red-600">
            Limpiar
          </button>
        )}
      </div>
      <textarea
        className="min-h-56 w-full resize-y rounded-md border border-stone-200 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-stone-400"
        placeholder={`Escriba o pegue el contenido para "${section.title}"…`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </section>
  );
}
