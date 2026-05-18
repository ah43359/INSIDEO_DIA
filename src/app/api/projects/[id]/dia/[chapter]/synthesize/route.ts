// POST /api/projects/[id]/dia/[chapter]/synthesize
//
// Body:
//   {
//     sections: { sectionId: string; sectionTitle: string;
//                 userFields: Record<string,string> }[]
//   }
//
// Response:
//   {
//     results: { sectionId, content, citations, passagesRetrieved }[]
//     errors: { sectionId, message }[]
//   }
//
// Two-phase synthesis:
//   Phase 1 — leaf sections generated sequentially with a rolling context
//             window so prose flows coherently through the chapter.
//   Phase 2 — parent (non-leaf) sections generated bottom-up using their
//             children's prose + RAG examples to write intro paragraphs.
//
// Caller previews results in a modal and writes accepted content into
// state.content[sectionId].

import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/with-auth";
import { findChapter, isValidChapterId, getChapterSections } from "@/lib/dia/chapters";
import {
  synthesizeSections,
  synthesizeParentSections,
  type SynthesisInput,
  type ParentSectionTarget,
  type SectionSynthesis,
} from "@/lib/dia/rag/synthesize";
import type { ComponentDescriptor, ProjectFacts } from "@/lib/dia/rag/prompts";
import type { SectionNode } from "@/lib/dia/framework/manifest";

interface RouteParams {
  params: Promise<{ id: string; chapter: string }>;
}

interface RequestBody {
  sections?: ReadonlyArray<{
    sectionId: string;
    sectionTitle: string;
    userFields?: Record<string, string>;
  }>;
}

export const maxDuration = 300; // seconds — sequential synthesis across a full chapter

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse | Response> {
  const { id, chapter } = await params;
  const chapterNum = Number.parseInt(chapter, 10);
  if (!Number.isFinite(chapterNum) || !isValidChapterId(chapterNum)) {
    return NextResponse.json({ error: "Capítulo inválido" }, { status: 400 });
  }
  const entry = findChapter(chapterNum);
  if (!entry) return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });

  const auth = await requireUser();
  if (!auth.authenticated) return auth.response;
  const { supabase } = auth.value;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo" }, { status: 400 });
  }
  const sections = body.sections ?? [];
  if (sections.length === 0) {
    return NextResponse.json({ error: "No se solicitaron secciones para sintetizar" }, { status: 400 });
  }
  if (sections.length > 80) {
    return NextResponse.json(
      { error: `Demasiadas secciones (${sections.length}). Máximo 80 por request.` },
      { status: 400 },
    );
  }

  // Load project facts for the prompt
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("nombre_proyecto, distrito, provincia, region")
    .eq("id", id)
    .single();
  if (projErr || !project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado", detail: projErr?.message },
      { status: 404 },
    );
  }
  const proj = project as {
    nombre_proyecto: string;
    distrito: string | null;
    provincia: string | null;
    region: string | null;
  };

  // Query component inventory for platform/road counts
  const { data: inventario } = await supabase
    .from("componente_inventario")
    .select("componente, cantidad, attrs")
    .eq("project_id", id);

  const BUCKET_RULES: Array<{ bucket: string; pattern: RegExp }> = [
    { bucket: "plataforma", pattern: /plataforma|^pad\b/i },
    { bucket: "sondaje", pattern: /sondaje|sondeo|\bdhh\b|\bddh\b/i },
    { bucket: "acceso", pattern: /acceso|camino/i },
    { bucket: "helipuerto", pattern: /helipuerto|heli\b/i },
    { bucket: "piscina", pattern: /piscina|poza/i },
    { bucket: "trinchera", pattern: /trinchera/i },
    { bucket: "manguera", pattern: /manguera/i },
    { bucket: "pase", pattern: /pase\b|pase\s+vehicular/i },
    { bucket: "patio", pattern: /patio/i },
  ];
  let numPlataformas = 0;
  let numSondajes = 0;
  const auxiliarParts: string[] = [];
  // Detailed component inventory for the prompt (preserves RFI attrs).
  const components: ComponentDescriptor[] = [];
  for (const c of inventario ?? []) {
    const bucket = BUCKET_RULES.find((r) => r.pattern.test(c.componente))?.bucket ?? "other";
    const qty = Number.isFinite(Number(c.cantidad)) ? Number(c.cantidad) : 0;
    if (bucket === "plataforma") {
      numPlataformas += qty;
      const sondajesAttr = Number((c.attrs as Record<string, unknown>)?.sondajes);
      if (Number.isFinite(sondajesAttr)) numSondajes += sondajesAttr;
    } else if (bucket === "sondaje") {
      numSondajes += qty;
    } else if (bucket !== "acceso") {
      auxiliarParts.push(`${qty} ${c.componente}`);
    }
    // Always preserve in the structured components list (incl. plataforma/sondaje
    // so the LLM can describe their characteristics, not just count them).
    components.push({
      tipo: c.componente,
      label: friendlyComponentName(c.componente),
      cantidad: qty,
      caracteristicas: formatRfiAttrs(c.attrs as Record<string, unknown> | null),
    });
  }

  // Acceso km from geometry RPC
  const { data: geomFc } = await supabase.rpc("project_features", { p_id: id });
  let kmAccesos = 0;
  for (const f of ((geomFc as { features?: unknown[] })?.features ?? [])) {
    const props = (f as { properties: Record<string, unknown> }).properties;
    if (
      /acceso|camino/i.test(String(props.tipo ?? "")) ||
      /acceso|camino/i.test(String(props.nombre ?? ""))
    ) {
      const m = Number(props.longitud_tunel_m);
      if (Number.isFinite(m)) kmAccesos += m / 1000;
    }
  }

  const projectFacts: ProjectFacts = {
    nombre: proj.nombre_proyecto,
    distrito: proj.distrito ?? undefined,
    provincia: proj.provincia ?? undefined,
    region: proj.region ?? undefined,
    numPlataformas: numPlataformas > 0 ? String(numPlataformas) : undefined,
    numSondajes: numSondajes > 0 ? String(numSondajes) : undefined,
    kmAccesos: kmAccesos > 0 ? kmAccesos.toFixed(3) : undefined,
    auxiliarList: auxiliarParts.length > 0 ? auxiliarParts.join(", ") : undefined,
    components: components.length > 0 ? components : undefined,
  };

  // Confirm the corpus has any rows for this chapter
  const { count, error: countErr } = await supabase
    .from("dia_corpus_examples")
    .select("id", { count: "exact", head: true })
    .eq("chapter_num", chapterNum);
  if (countErr) {
    return NextResponse.json({ error: "Error consultando corpus", detail: countErr.message }, { status: 500 });
  }
  if (!count || count === 0) {
    return NextResponse.json(
      {
        error: `El corpus para el Capítulo ${chapterNum} está vacío. Ejecuta el indexador (scripts/dia-corpus/index-cap.ts) con DIAs aprobados antes de usar Generar con IA.`,
      },
      { status: 412 },
    );
  }

  const input: SynthesisInput = {
    chapterNum,
    project: projectFacts,
    sections: sections.map((s) => ({
      sectionId: s.sectionId,
      sectionTitle: s.sectionTitle,
      userFields: s.userFields ?? {},
    })),
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object): void => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        // Phase 1 — leaf sections
        const totalLeaves = input.sections.length;
        send({ type: "start", totalLeaves });

        let leafDone = 0;
        const phase1 = await synthesizeSections(supabase, input, (sectionId, result) => {
          leafDone++;
          if (result) {
            send({ type: "section", sectionId: result.sectionId, content: result.content, citations: result.citations, passagesRetrieved: result.passagesRetrieved, isParent: false });
          }
          send({ type: "progress", phase: 1, done: leafDone, total: totalLeaves, sectionId });
        });

        // Phase 2 — parent intro paragraphs
        const chapterSections = getChapterSections(chapterNum);
        const generatedContent = new Map<string, string>(
          phase1.results.map((r) => [r.sectionId, r.content]),
        );
        const parentTargets = chapterSections
          ? collectParentTargets(chapterSections, generatedContent)
          : [];

        send({ type: "phase2_start", totalParents: parentTargets.length });

        let parentDone = 0;
        const phase2 =
          parentTargets.length > 0
            ? await synthesizeParentSections(
                supabase,
                chapterNum,
                projectFacts,
                parentTargets,
                (sectionId, result) => {
                  parentDone++;
                  if (result) {
                    send({ type: "section", sectionId: result.sectionId, content: result.content, citations: result.citations, passagesRetrieved: result.passagesRetrieved, isParent: true });
                  }
                  send({ type: "progress", phase: 2, done: parentDone, total: parentTargets.length, sectionId });
                },
              )
            : { results: [] as SectionSynthesis[], errors: [] as Array<{ sectionId: string; message: string }> };

        send({
          type: "result",
          results: [...phase1.results, ...phase2.results],
          errors: [...phase1.errors, ...phase2.errors],
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "X-Content-Type-Options": "nosniff" },
  });
}

// ── Component formatting for the prompt ───────────────────────────────────────

/**
 * Map `componente_inventario.componente` snake_case keys to friendlier
 * Spanish phrases for the LLM prompt. Conservative: only types we've seen
 * in the RFI are mapped; anything else falls back to the raw key with
 * underscores replaced by spaces.
 */
function friendlyComponentName(raw: string): string {
  const map: Record<string, string> = {
    plataforma: "plataformas de perforación",
    plataforma_perforacion: "plataformas de perforación",
    plataforma_de_perforacion: "plataformas de perforación",
    pad: "plataformas (pads) de perforación",
    sondaje: "sondajes",
    sondeo: "sondajes",
    acceso: "accesos / caminos",
    camino: "accesos / caminos",
    helipuerto: "helipuertos",
    piscina: "piscinas / pozas",
    poza: "pozas",
    poza_sedimentacion: "pozas de sedimentación",
    pozas_sedimentacion: "pozas de sedimentación",
    trinchera: "trincheras",
    manguera: "tendidos de manguera",
    pase: "pases vehiculares",
    patio: "patios de maquinaria",
    campamento: "campamentos",
    campamento_principal: "campamento principal",
    almacen: "almacenes",
    almacenes: "almacenes / bodegas",
    almacenes_bodegas: "almacenes / bodegas",
    polvorin: "polvorín de explosivos",
    pozos_perforacion: "pozos de perforación",
    calicatas: "calicatas",
    puntos_muestreo_superficial: "puntos de muestreo superficial",
    captaciones_agua: "captaciones de agua",
    tanques_agua: "tanques de agua",
    tanques_combustible: "tanques de combustible",
    area_residuos_no_peligrosos: "área de residuos no peligrosos",
    area_residuos_peligrosos: "área de residuos peligrosos",
    depositos_top_soil: "depósitos de top-soil",
    generadores: "generadores eléctricos",
  };
  return map[raw.toLowerCase()] ?? raw.replace(/_/g, " ");
}

/**
 * Convert the RFI `attrs` JSONB into a flat string→string map for the prompt.
 * Drops internal flags (`estado`, `sondajes` already accounted for above) and
 * formats numeric-with-unit values consistently.
 */
function formatRfiAttrs(
  attrs: Record<string, unknown> | null,
): Record<string, string> | undefined {
  if (!attrs) return undefined;
  const SKIP = new Set(["estado", "sondajes"]); // already surfaced separately
  const ATTR_LABELS: Record<string, string> = {
    area_m2: "área",
    area: "área",
    profundidad: "profundidad",
    profundidad_m: "profundidad",
    dimensiones: "dimensiones",
    capacidad: "capacidad",
    capacidad_m3: "capacidad",
    longitud: "longitud",
    longitud_m: "longitud",
    ancho: "ancho",
    largo: "largo",
    altura: "altura",
    material: "material",
    volumen: "volumen",
    volumen_m3: "volumen",
  };
  const UNITS: Record<string, string> = {
    area_m2: "m²",
    profundidad_m: "m",
    capacidad_m3: "m³",
    longitud_m: "m",
    volumen_m3: "m³",
  };
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(attrs)) {
    if (SKIP.has(key)) continue;
    if (raw === null || raw === undefined || raw === "") continue;
    const label = ATTR_LABELS[key] ?? key.replace(/_/g, " ");
    const unit = UNITS[key];
    const valueStr = typeof raw === "number"
      ? `${raw}${unit ? " " + unit : ""}`
      : String(raw);
    out[label] = valueStr;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Walk the section tree depth-first and collect parent nodes (non-leaf)
 *  whose direct children have generated content. Returns in bottom-up order
 *  so deeper parents are generated before their ancestors. */
function collectParentTargets(
  nodes: readonly SectionNode[],
  generatedContent: Map<string, string>,
): ParentSectionTarget[] {
  const targets: ParentSectionTarget[] = [];

  function walk(ns: readonly SectionNode[]): void {
    for (const node of ns) {
      if (node.children.length > 0) {
        // Recurse first → children collected before parents (bottom-up)
        walk(node.children);

        const childSections = node.children
          .filter((c) => generatedContent.has(c.id))
          .map((c) => ({
            sectionId: c.id,
            sectionTitle: c.title,
            content: generatedContent.get(c.id)!,
          }));

        if (childSections.length > 0) {
          targets.push({ sectionId: node.id, sectionTitle: node.title, childSections });
        }
      }
    }
  }

  walk(nodes);
  return targets;
}
