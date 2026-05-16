"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALL_SECTION_IDS,
  DG_FIELDS,
  type DgGroupKey,
  INTRO_FIELDS_DIA,
  INTRO_GROUP_ORDER,
  type IntroField,
  type IntroGroup,
  type SectionNode,
  SECTIONS,
  findSection,
} from "@/lib/dia/cap2/fields";
import {
  type Cap2State,
  type UtmZone,
  fromExportV7,
  toExportV7,
} from "@/lib/dia/cap2/state";
import { findBasin } from "@/lib/dia/cap2/utm";

interface Cap2EditorProps {
  projectId: string;
  projectName: string;
  prefill: Cap2State;
  warnings: readonly string[];
}

type GenerateState = "idle" | "generating" | "error";

function storageKey(projectId: string): string {
  return `cap2:${projectId}`;
}

function loadState(projectId: string, prefill: Cap2State): Cap2State {
  if (typeof window === "undefined") return prefill;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId));
    if (!raw) return prefill;
    const parsed = JSON.parse(raw) as Partial<Cap2State>;
    return {
      introType: parsed.introType === "MDIA" ? "MDIA" : prefill.introType,
      utmZone: (["17S", "18S", "19S"] as const).includes(parsed.utmZone as UtmZone)
        ? (parsed.utmZone as UtmZone)
        : prefill.utmZone,
      introFields: { ...prefill.introFields, ...(parsed.introFields ?? {}) },
      dgFields: { ...prefill.dgFields, ...(parsed.dgFields ?? {}) },
      content: { ...prefill.content, ...(parsed.content ?? {}) },
    };
  } catch {
    return prefill;
  }
}

export default function Cap2Editor({ projectId, projectName, prefill, warnings }: Cap2EditorProps) {
  const [state, setState] = useState<Cap2State>(() => prefill);
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState<string>("2.1");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(["2.0", "2.2", "2.8"]));
  const [generate, setGenerate] = useState<GenerateState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hydrate from localStorage on mount (overlays the SSR prefill). The
  // set-state-in-effect rule fires here because we call setState from inside
  // an effect body, but this is the canonical SSR + localStorage hydration
  // overlay pattern: the initial render uses `prefill`, then the client-only
  // localStorage state replaces it after mount. A lazy useState initializer
  // would not work because `prefill` can change across renders.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(loadState(projectId, prefill));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [projectId, prefill]);

  // Persist on every change (after hydration to avoid clobbering with prefill)
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
    } catch {
      // Storage quota/permissions errors are non-fatal for editor functionality
    }
  }, [state, projectId, hydrated]);

  const activeSection = useMemo(() => findSection(activeId), [activeId]);

  function setIntroField(key: string, value: string): void {
    setState((s) => ({ ...s, introFields: { ...s.introFields, [key]: value } }));
  }
  function setDgField(key: string, value: string): void {
    setState((s) => ({ ...s, dgFields: { ...s.dgFields, [key]: value } }));
  }
  function setContent(id: string, value: string): void {
    setState((s) => ({ ...s, content: { ...s.content, [id]: value } }));
  }
  function setUtmZone(z: UtmZone): void {
    setState((s) => ({ ...s, utmZone: z }));
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
    const payload = toExportV7(state);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cap2_descripcion_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flashNotice("JSON exportado");
  }

  function handleImportClick(): void {
    fileInputRef.current?.click();
  }

  function handleImportFile(ev: React.ChangeEvent<HTMLInputElement>): void {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result ?? ""));
        const imported = fromExportV7(parsed);
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
      const response = await fetch(`/api/projects/${projectId}/dia/2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toExportV7(state)),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Error ${response.status}`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cap2_Descripcion_${projectName.replace(/\s+/g, "_")}.docx`;
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

  return (
    <div className="mx-auto grid max-w-[1400px] grid-cols-[260px_1fr] gap-4 px-6 py-4">
      {/* Left: section tree + actions */}
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
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="flex-1 rounded-md border border-stone-200 px-2 py-1.5 text-xs text-stone-700 hover:bg-stone-50"
            >
              Exp JSON
            </button>
            <button
              onClick={handleImportClick}
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
            nodes={SECTIONS}
            activeId={activeId}
            openIds={openIds}
            onSelect={setActiveId}
            onToggle={toggleOpen}
            content={state.content}
          />
        </nav>
      </aside>

      {/* Right: editor pane */}
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

        {activeSection?.isIntro ? (
          <IntroPanel
            state={state}
            onIntroFieldChange={setIntroField}
            onUtmZoneChange={setUtmZone}
          />
        ) : activeSection?.structuredType ? (
          <StructuredPanel
            section={activeSection}
            groupKey={activeSection.structuredType}
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
  content: Record<string, string>;
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

interface SectionTreeNodeProps {
  node: SectionNode;
  activeId: string;
  openIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  content: Record<string, string>;
}

function SectionTreeNode({ node, activeId, openIds, onSelect, onToggle, content }: SectionTreeNodeProps) {
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

// ─── Intro panel (2.1) ────────────────────────────────────────────────

interface IntroPanelProps {
  state: Cap2State;
  onIntroFieldChange: (key: string, value: string) => void;
  onUtmZoneChange: (z: UtmZone) => void;
}

function IntroPanel({ state, onIntroFieldChange, onUtmZoneChange }: IntroPanelProps) {
  const fields = INTRO_FIELDS_DIA;
  const groups = useMemo(() => {
    const g: Record<IntroGroup, IntroField[]> = {
      Proyecto: [],
      Empresa: [],
      Ubicación: [],
      Plataformas: [],
      Accesos: [],
      "Infraestructura auxiliar": [],
    };
    for (const f of fields) g[f.group].push(f);
    return g;
  }, [fields]);

  const easting = parseFloat(state.introFields.coordEste ?? "");
  const northing = parseFloat(state.introFields.coordNorte ?? "");
  const basin =
    Number.isFinite(easting) && Number.isFinite(northing) && easting > 100000 && northing > 7000000
      ? findBasin(easting, northing, state.utmZone)
      : null;

  return (
    <div className="space-y-4">

      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
          2.1 Introducción · campos
        </h2>
        {INTRO_GROUP_ORDER.map((g) => {
          const fs = groups[g];
          if (!fs || fs.length === 0) return null;
          return (
            <div key={g} className="mb-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">{g}</div>

              {g === "Ubicación" && (
                <div className="mb-2">
                  <label className="mb-1 block text-xs font-medium text-stone-600">Zona UTM</label>
                  <div className="flex gap-2">
                    {(["17S", "18S", "19S"] as const).map((z) => (
                      <button
                        key={z}
                        onClick={() => onUtmZoneChange(z)}
                        className={`flex-1 rounded border-2 py-1.5 text-sm font-semibold transition ${
                          state.utmZone === z
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                {fs.map((f) => (
                  <div key={f.key}>
                    <label className="mb-0.5 block text-xs font-medium text-stone-600">{f.label}</label>
                    {f.key === "auxiliarList" ? (
                      <textarea
                        className="min-h-16 w-full resize-y rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
                        placeholder={f.placeholder}
                        value={state.introFields[f.key] ?? ""}
                        onChange={(e) => onIntroFieldChange(f.key, e.target.value)}
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
                        placeholder={f.placeholder}
                        value={state.introFields[f.key] ?? ""}
                        onChange={(e) => onIntroFieldChange(f.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {g === "Ubicación" && basin && (
                <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-xs">
                  <p className="text-emerald-800">
                    <span className="font-semibold">Cuenca detectada:</span>{" "}
                    {basin.basin ?? "No identificada en la base de datos"}
                  </p>
                  <p className="mt-0.5 text-emerald-600">
                    Lat: {basin.lat.toFixed(4)}° · Lon: {basin.lon.toFixed(4)}° · Zona {state.utmZone}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

// ─── Structured fields panel ──────────────────────────────────────────

interface StructuredPanelProps {
  section: SectionNode;
  groupKey: DgGroupKey;
  dgFields: Record<string, string>;
  content: Record<string, string>;
  onDgFieldChange: (key: string, value: string) => void;
  onContentChange: (id: string, value: string) => void;
}

function StructuredPanel({
  section,
  groupKey,
  dgFields,
  content,
  onDgFieldChange,
  onContentChange,
}: StructuredPanelProps) {
  const fields = DG_FIELDS[groupKey] ?? [];
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

// ─── Free text panel ──────────────────────────────────────────────────

interface FreeTextPanelProps {
  section: SectionNode;
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}

function FreeTextPanel({ section, value, onChange, compact }: FreeTextPanelProps) {
  void ALL_SECTION_IDS; // Reference to keep import noted in tree-shake-aware bundlers
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {compact ? "Texto adicional" : section.title}
        </h2>
        {value.trim() && (
          <button
            onClick={() => onChange("")}
            className="text-xs text-red-400 hover:text-red-600"
          >
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
