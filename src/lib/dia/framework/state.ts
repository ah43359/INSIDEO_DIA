// Generic chapter state shared across all DIA chapters.
//
// Cap. 2 currently has a richer state shape (with introType + utmZone) for
// historical reasons (round-trip with the standalone HTML template's v7
// JSON). New chapters should use this minimal shape instead.

export type ChapterFields = Record<string, string>;

export interface ChapterState {
  /** Top-of-chapter intro fields, when applicable. */
  introFields: ChapterFields;
  /** Per-section structured fields, keyed by `dg_*` / `re_*` field names. */
  dgFields: ChapterFields;
  /** Free-text content per section id. */
  content: ChapterFields;
}

export interface ChapterExportV7 {
  version: 7;
  exportDate: string;
  introFields: ChapterFields;
  dgFields: ChapterFields;
  content: ChapterFields;
}

export function emptyChapterState(): ChapterState {
  return { introFields: {}, dgFields: {}, content: {} };
}

export function toChapterExportV7(state: ChapterState): ChapterExportV7 {
  return {
    version: 7,
    exportDate: new Date().toISOString(),
    introFields: { ...state.introFields },
    dgFields: { ...state.dgFields },
    content: { ...state.content },
  };
}

export function fromChapterExportV7(payload: unknown): ChapterState {
  if (!payload || typeof payload !== "object") {
    throw new Error("JSON inválido: se esperaba un objeto");
  }
  const p = payload as Partial<ChapterExportV7>;
  if (p.version !== 7) {
    throw new Error(`Versión no soportada: ${String(p.version)} (esperado 7)`);
  }
  return {
    introFields: sanitizeMap(p.introFields),
    dgFields: sanitizeMap(p.dgFields),
    content: sanitizeMap(p.content),
  };
}

function sanitizeMap(value: unknown): ChapterFields {
  if (!value || typeof value !== "object") return {};
  const out: ChapterFields = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
