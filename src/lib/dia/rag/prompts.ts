// Prompt builders for the DIA RAG synthesis.
//
// The system prompt + retrieved corpus snippets are static across all
// section calls in a single generation run, so we mark them with
// `cache_control: { type: "ephemeral" }` to take advantage of Anthropic
// prompt caching (~80% input-token discount on cached blocks within 5
// minutes).

import type { CorpusMatch } from "./retrieval";
import { UNIVERSAL_PATTERN, renderRecipeForPrompt } from "./baselinePlaybook";

function chapterTask(chapterNum: number): string {
  if (chapterNum === 2)
    return "Tu tarea es redactar la sección indicada del Capítulo 2 (Descripción del Proyecto) para un proyecto específico de exploración minera en Perú, conforme al RM N° 108-2018-MEM/DM. " +
      "Principio clave: la METODOLOGÍA de las actividades (construcción/habilitación, operación/perforación, cierre/post-cierre) es esencialmente idéntica entre proyectos de exploración — se ejecutan las mismas técnicas (perforación diamantina con sondaje, lodos de bentonita, manejo de top-soil, revegetación) sin importar si el proyecto tiene 5 o 50 plataformas. " +
      "Lo que VARÍA es: la cantidad y dimensiones de los componentes (plataformas, sondajes, accesos, auxiliares), el nombre del titular, la ubicación, y los volúmenes/duraciones derivados de esas cantidades. " +
      "Reproduce fielmente la metodología, terminología técnica, secuencia de actividades y compromisos de los ejemplos aprobados. Sustituye ÚNICAMENTE: nombre del proyecto, ubicación (distrito/provincia/región), conteos (N° de plataformas, sondajes, km de accesos), dimensiones (área m², profundidad m, capacidad m³) y nombres de componentes auxiliares cuando aparecen explícitamente en los datos del proyecto provistos abajo. Si los ejemplos mencionan un componente que el proyecto NO tiene, omítelo. Si el proyecto tiene un componente que los ejemplos no cubren, descríbelo brevemente al final de la lista correspondiente.";
  if (chapterNum === 3)
    return "Tu tarea es redactar la sección indicada del Capítulo 3 (Línea Base) para un proyecto específico de exploración minera en Perú, conforme al RM N° 108-2018-MEM/DM. La Línea Base describe el estado pre-proyecto del medio físico, biológico y socioeconómico-cultural. Combina los datos de campo / monitoreo cargados por el usuario con la metodología y narrativa de los ejemplos aprobados. Cita protocolos y normas (D.S. 003-2017-MINAM, D.S. 004-2017-MINAM, D.S. 085-2003-PCM, D.S. 011-2017-MINAM, D.S. 043-2006-AG, CITES, IUCN) tal como aparecen en los ejemplos.";
  if (chapterNum === 4)
    return "Tu tarea es redactar la sección indicada del Capítulo 4 (Plan de Participación Ciudadana) para un proyecto específico de exploración minera en Perú, conforme al RM N° 304-2008-MEM/DM. Los planes de PC son altamente templados — replica fielmente la estructura de mecanismos, talleres, convocatorias y matrices de aportes, sustituyendo nombres, fechas y centros poblados específicos del proyecto.";
  if (chapterNum === 5)
    return "Tu tarea es redactar la sección indicada del Capítulo 5 (Identificación y Evaluación de Impactos Ambientales) para un proyecto específico de exploración minera en Perú, conforme al RM N° 108-2018-MEM/DM. Usa la metodología Conesa (importancia ambiental) tal como aparece en los ejemplos. Distingue claramente impactos sobre los medios físico, biológico y socioeconómico-cultural. Mantén consistencia entre la matriz de valoración y las conclusiones.";
  if (chapterNum === 6)
    return "Tu tarea es redactar la sección indicada del Capítulo 6 (Plan de Manejo Ambiental) para un proyecto específico de exploración minera en Perú, conforme al RM N° 108-2018-MEM/DM. Los planes de manejo ambiental son muy similares entre proyectos de exploración — reproduce fielmente la estructura, medidas, indicadores y compromisos de los ejemplos aprobados, sustituyendo únicamente el nombre del proyecto y su ubicación.";
  if (chapterNum === 7)
    return "Tu tarea es redactar la sección indicada del Capítulo 7 (Empresa Consultora) para un proyecto específico de exploración minera en Perú. Es una sección administrativa: identificación de la consultora, inscripción en SENACE (RIDA), equipo multidisciplinario y anexos (CVs, cartas de compromiso, firmas digitales). Mantén tono formal-administrativo y replica la estructura de los ejemplos.";
  return `Tu tarea es redactar la sección indicada del Capítulo ${chapterNum} para un proyecto específico de exploración minera en Perú, conforme al RM N° 108-2018-MEM/DM.`;
}

export function buildSystemPrompt(chapterNum: number, sectionPath?: string): string {
  const base = `Eres un redactor técnico ambiental especializado en Estudios de Impacto Ambiental (DIA / MDIA – Categoría I) para minería de exploración en Perú. ${chapterTask(chapterNum)}

REGLAS DE REDACCIÓN
- Replica fielmente la estructura, medidas, indicadores, responsables y lenguaje de los ejemplos aprobados que recibirás.
- Si los ejemplos usan listas con viñetas, redacta con viñetas. Si usan párrafos, redacta con párrafos.
- Sustituye únicamente los datos específicos del proyecto: nombre, ubicación (distrito, provincia, región), cantidad de componentes (plataformas, sondajes, km de accesos). Todo lo demás debe seguir el patrón de los ejemplos.
- Utiliza datos concretos (números, distancias, frecuencias, normativas, kilometrajes) cuando estén disponibles en los datos del proyecto.
- No inventes datos. Si un valor no aparece en los datos del proyecto pero los ejemplos sí lo usan, deja un marcador entre corchetes "[INDICAR ...]" en lugar de fabricarlo.
- Mantén el lenguaje formal técnico-ambiental peruano (uso de "se ejecutará", "se realizará", "el titular", "el Proyecto", "área efectiva", "área de influencia").
- Cita las normas exactamente como aparecen en los ejemplos (ej. "D.S. N° 003-2017-MINAM", no "Decreto Supremo 003-2017").
- Las viñetas deben usar el carácter "-" al inicio (sin numeración).

FORMATO DE SALIDA
- Responde solo con la sección redactada en español.
- No incluyas el encabezado de la sección (el título ya está en el documento).
- No agregues comentarios meta como "Aquí está la redacción:" o "Espero que sea útil".
- No uses Markdown — solo texto plano con líneas separadas (cada línea con "- " es una viñeta).`;

  if (chapterNum !== 3) return base;

  // Cap 3 (Línea Base): inject the methodology contract from
  // `knowledge/playbooks/baseline-results-writing.md`, mirrored in
  // `baselinePlaybook.ts`. The universal 5-block pattern is appended for every
  // Cap 3 call; the per-section recipe is appended when sectionPath matches a
  // known leaf in RECIPES.
  const recipe = sectionPath ? renderRecipeForPrompt(sectionPath) : null;
  const cap3Suffix = [
    "",
    "PATRÓN NARRATIVO UNIVERSAL DE LÍNEA BASE (obligatorio)",
    UNIVERSAL_PATTERN,
    recipe ? "\n" + recipe : "",
    "",
    "REGLAS ADICIONALES PARA CAP 3",
    "- Si los ejemplos del corpus citan decretos derogados (DS 074-2001-PCM, DS 002-2008-MINAM, DS 015-2015-MINAM, DS 002-2013-MINAM), reemplázalos por el decreto vigente del contrato metodológico. Nunca cites un decreto derogado.",
    "- Si los ejemplos no declaran categoría de agua o zona de ruido, agrégalas con sustento. Su ausencia es una observación dura del evaluador.",
    "- Toda excedencia se reporta con estación + parámetro + valor medido + umbral + magnitud relativa (Δ%) + atribución preliminar.",
    "- Las temporadas se reportan desagregadas; no promediar seca con húmeda sin reportar cada una.",
  ].join("\n");

  return base + cap3Suffix;
}

export interface ProjectFacts {
  nombre: string;
  distrito?: string;
  provincia?: string;
  region?: string;
  numPlataformas?: string;
  numSondajes?: string;
  kmAccesos?: string;
  auxiliarList?: string;
  cuenca?: string;
  /**
   * Full project component inventory from the RFI submission. Each item
   * lists a component type, its quantity, and any characteristics captured
   * in the RFI `attrs` JSONB (area, dimensions, capacity, depth, etc.).
   *
   * Cap 2 RAG depends on this: methodology (construction / operation /
   * closure) is identical across projects, but the components and their
   * characteristics vary. The LLM receives this list to substitute counts
   * and dimensions while reproducing the methodology verbatim from the
   * approved examples.
   */
  components?: readonly ComponentDescriptor[];
}

export interface ComponentDescriptor {
  /** Component type from `componente_inventario.componente` (snake_case key,
   *  e.g. "plataforma_perforacion", "campamento_principal"). */
  tipo: string;
  /** Friendly Spanish name for display in the prompt, e.g. "plataformas de
   *  perforación". When absent, falls back to `tipo` with underscores → spaces. */
  label?: string;
  cantidad: number;
  /** Free-form characteristics from the RFI attrs JSONB, formatted for prompt
   *  display: `{ "área": "1500 m²", "profundidad": "150 m" }`. */
  caracteristicas?: Readonly<Record<string, string>>;
}

export interface PriorSection {
  sectionId: string;
  sectionTitle: string;
  content: string;
}

export function buildUserPrompt(args: {
  sectionPath: string;
  sectionTitle: string;
  project: ProjectFacts;
  userFields: Record<string, string>;
  retrieved: CorpusMatch[];
  priorContext?: readonly PriorSection[];
}): string {
  const { sectionPath, sectionTitle, project, userFields, retrieved, priorContext } = args;

  const projectLines = [
    `- Nombre del proyecto: ${project.nombre}`,
    project.distrito ? `- Distrito: ${project.distrito}` : null,
    project.provincia ? `- Provincia: ${project.provincia}` : null,
    project.region ? `- Región: ${project.region}` : null,
    project.numPlataformas ? `- Plataformas de perforación: ${project.numPlataformas}` : null,
    project.numSondajes ? `- Sondajes: ${project.numSondajes}` : null,
    project.kmAccesos ? `- Kilómetros de accesos: ${project.kmAccesos}` : null,
    project.cuenca ? `- Cuenca: ${project.cuenca}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Detailed component inventory from the RFI submission. When present this
  // supersedes the terse `auxiliarList` for chapters where component
  // characteristics actually matter (Cap 2 especially).
  const componentsBlock = renderComponentsBlock(project.components, project.auxiliarList);

  const userFieldsLines = Object.entries(userFields)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v.trim()}`)
    .join("\n");

  const examplesText = retrieved.length
    ? retrieved
        .map(
          (r, i) =>
            `--- Ejemplo ${i + 1} (${r.instrument_type ?? "DIA"} ${r.project_name ?? "?"}, sección "${r.section_path}", similitud ${(r.similarity * 100).toFixed(1)}%) ---\n${r.content.trim()}`,
        )
        .join("\n\n")
    : "(no se encontraron ejemplos relevantes — redacta a partir de los datos del proyecto)";

  const priorBlock =
    priorContext && priorContext.length > 0
      ? `SECCIONES ANTERIORES YA REDACTADAS (para dar continuidad narrativa)\n${priorContext
          .map((p) => `--- ${p.sectionId} ${p.sectionTitle} ---\n${p.content.trim()}`)
          .join("\n\n")}\n\n`
      : "";

  return `SECCIÓN A REDACTAR
${sectionPath} — ${sectionTitle}

DATOS DEL PROYECTO
${projectLines}

${componentsBlock}${userFieldsLines ? `CAMPOS LLENADOS POR EL USUARIO PARA ESTA SECCIÓN\n${userFieldsLines}\n\n` : ""}${priorBlock}EJEMPLOS APROBADOS DE PROYECTOS SIMILARES
${examplesText}

INSTRUCCIONES
Replica la estructura y contenido de los ejemplos para la sección "${sectionTitle}" del proyecto "${project.nombre}". Sustituye únicamente los datos específicos del proyecto. Solo el cuerpo de la sección, sin encabezado.`;
}

/**
 * Format the project's component inventory for the prompt. Falls back to the
 * terse `auxiliarList` when no structured components were provided (back-compat
 * with the older synthesis path).
 */
function renderComponentsBlock(
  components: readonly ComponentDescriptor[] | undefined,
  auxiliarList: string | undefined,
): string {
  if (components && components.length > 0) {
    const lines = components.map((c) => {
      const label = c.label ?? c.tipo.replace(/_/g, " ");
      const caracs = c.caracteristicas
        ? Object.entries(c.caracteristicas)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        : "";
      return `- ${c.cantidad} ${label}${caracs ? ` (${caracs})` : ""}`;
    });
    return `INVENTARIO DE COMPONENTES DEL PROYECTO (del RFI)
${lines.join("\n")}

`;
  }
  if (auxiliarList && auxiliarList.trim()) {
    return `COMPONENTES AUXILIARES (resumen)
- ${auxiliarList}

`;
  }
  return "";
}

export function buildParentUserPrompt(args: {
  sectionPath: string;
  sectionTitle: string;
  project: ProjectFacts;
  childSections: readonly { sectionId: string; sectionTitle: string; content: string }[];
  retrieved: CorpusMatch[];
}): string {
  const { sectionPath, sectionTitle, project, childSections, retrieved } = args;

  const projectLines = [
    `- Nombre del proyecto: ${project.nombre}`,
    project.distrito ? `- Distrito: ${project.distrito}` : null,
    project.provincia ? `- Provincia: ${project.provincia}` : null,
    project.region ? `- Región: ${project.region}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const examplesText = retrieved.length
    ? retrieved
        .map(
          (r, i) =>
            `--- Ejemplo ${i + 1} (${r.instrument_type ?? "DIA"} ${r.project_name ?? "?"}, sección "${r.section_path}", similitud ${(r.similarity * 100).toFixed(1)}%) ---\n${r.content.trim()}`,
        )
        .join("\n\n")
    : "(no se encontraron ejemplos de introducción para esta sección)";

  const childSummary = childSections
    .map((c) => `--- ${c.sectionId} ${c.sectionTitle} ---\n${c.content.slice(0, 400).trim()}${c.content.length > 400 ? "…" : ""}`)
    .join("\n\n");

  return `SECCIÓN A REDACTAR (introducción de sección padre)
${sectionPath} — ${sectionTitle}

DATOS DEL PROYECTO
${projectLines}

CONTENIDO DE LAS SUB-SECCIONES (para articular la introducción)
${childSummary}

EJEMPLOS APROBADOS DE INTRODUCCIONES SIMILARES
${examplesText}

INSTRUCCIONES
Redacta 1 a 3 párrafos introductorios para la sección "${sectionTitle}" del proyecto "${project.nombre}". El texto debe presentar y articular las sub-secciones detalladas arriba, siguiendo el estilo de los ejemplos. No repitas el contenido de las sub-secciones. Solo el cuerpo introductorio, sin encabezado.`;
}

export interface SourceCitation {
  sourceFilename: string;
  projectName: string | null;
  instrumentType: string | null;
  sectionPath: string;
  similarity: number;
}

export function citationsFromMatches(matches: CorpusMatch[]): SourceCitation[] {
  return matches.map((m) => ({
    sourceFilename: m.source_filename,
    projectName: m.project_name,
    instrumentType: m.instrument_type,
    sectionPath: m.section_path,
    similarity: m.similarity,
  }));
}
