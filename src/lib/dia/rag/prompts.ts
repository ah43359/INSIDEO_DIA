// Prompt builders for the Cap. 6 RAG synthesis.
//
// The system prompt + retrieved corpus snippets are static across all
// section calls in a single generation run, so we mark them with
// `cache_control: { type: "ephemeral" }` to take advantage of Anthropic
// prompt caching (~80% input-token discount on cached blocks within 5
// minutes).

import type { CorpusMatch } from "./retrieval";

export const SYSTEM_PROMPT = `Eres un redactor técnico ambiental especializado en Estudios de Impacto Ambiental (DIA / MDIA – Categoría I) para minería de exploración en Perú, conforme al RM N° 108-2018-MEM/DM. Tu tarea es redactar la sección indicada del Capítulo 6 (Plan de Manejo Ambiental) para un proyecto específico.

REGLAS DE REDACCIÓN
- Imita fielmente el tono, estructura y vocabulario de los ejemplos aprobados que recibirás como contexto.
- Si los ejemplos usan listas con viñetas, redacta con viñetas. Si usan párrafos, redacta con párrafos.
- Utiliza datos concretos (números, distancias, frecuencias, normativas, kilometrajes) cuando estén disponibles en los datos del proyecto que se te entregan.
- No inventes datos. Si un valor no aparece en los datos del proyecto pero los ejemplos sí lo usan, deja un marcador entre corchetes "[INDICAR ...]" en lugar de fabricarlo.
- Mantén el lenguaje formal técnico-ambiental peruano (uso de "se ejecutará", "se realizará", "el titular", "el Proyecto", "área efectiva", "área de influencia").
- Cita las normas exactamente como aparecen en los ejemplos (ej. "D.S. N° 003-2017-MINAM", no "Decreto Supremo 003-2017").
- Las viñetas deben usar el carácter "-" al inicio (sin numeración).

FORMATO DE SALIDA
- Responde solo con la sección redactada en español.
- No incluyas el encabezado de la sección (el título ya está en el documento).
- No agregues comentarios meta como "Aquí está la redacción:" o "Espero que sea útil".
- No uses Markdown — solo texto plano con líneas separadas (cada línea con "- " es una viñeta).`;

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
}

export function buildUserPrompt(args: {
  sectionPath: string;
  sectionTitle: string;
  project: ProjectFacts;
  userFields: Record<string, string>;
  retrieved: CorpusMatch[];
}): string {
  const { sectionPath, sectionTitle, project, userFields, retrieved } = args;

  const projectLines = [
    `- Nombre del proyecto: ${project.nombre}`,
    project.distrito ? `- Distrito: ${project.distrito}` : null,
    project.provincia ? `- Provincia: ${project.provincia}` : null,
    project.region ? `- Región: ${project.region}` : null,
    project.numPlataformas ? `- Plataformas de perforación: ${project.numPlataformas}` : null,
    project.numSondajes ? `- Sondajes: ${project.numSondajes}` : null,
    project.kmAccesos ? `- Kilómetros de accesos: ${project.kmAccesos}` : null,
    project.auxiliarList ? `- Componentes auxiliares: ${project.auxiliarList}` : null,
    project.cuenca ? `- Cuenca: ${project.cuenca}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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

  return `SECCIÓN A REDACTAR
${sectionPath} — ${sectionTitle}

DATOS DEL PROYECTO
${projectLines}

${userFieldsLines ? `CAMPOS LLENADOS POR EL USUARIO PARA ESTA SECCIÓN\n${userFieldsLines}\n` : ""}EJEMPLOS APROBADOS DE PROYECTOS SIMILARES
${examplesText}

INSTRUCCIONES
Redacta la sección "${sectionTitle}" para el proyecto "${project.nombre}" en el mismo estilo de los ejemplos. Solo el cuerpo de la sección, sin encabezado.`;
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
