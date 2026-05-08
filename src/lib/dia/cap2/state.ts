// Capítulo 2 editor state types.
//
// `Cap2ExportV7` matches the JSON shape used by the standalone template at
// C:\Users\ahija\Desktop\INSIDEO\CODE\eia-chapter2-description-template.html
// (line 1078 — `JSON.stringify({ version: 7, exportDate, introType, utmZone,
// introFields, dgFields, content }, ...)`). Keep field names in sync so users
// can round-trip JSON between this app and the standalone tool.

export type IntroType = "DIA" | "MDIA";
export type UtmZone = "17S" | "18S" | "19S";

export type IntroFields = Record<string, string>;
export type DgFields = Record<string, string>;
export type ContentMap = Record<string, string>;

export interface Cap2State {
  introType: IntroType;
  utmZone: UtmZone;
  introFields: IntroFields;
  dgFields: DgFields;
  content: ContentMap;
}

export interface Cap2ExportV7 {
  version: 7;
  exportDate: string;
  introType: IntroType;
  utmZone: UtmZone;
  introFields: IntroFields;
  dgFields: DgFields;
  content: ContentMap;
}

export function emptyCap2State(): Cap2State {
  return {
    introType: "DIA",
    utmZone: "19S",
    introFields: {},
    dgFields: {},
    content: {},
  };
}

export function toExportV7(state: Cap2State): Cap2ExportV7 {
  return {
    version: 7,
    exportDate: new Date().toISOString(),
    introType: state.introType,
    utmZone: state.utmZone,
    introFields: { ...state.introFields },
    dgFields: { ...state.dgFields },
    content: { ...state.content },
  };
}

export function fromExportV7(payload: unknown): Cap2State {
  if (!payload || typeof payload !== "object") {
    throw new Error("JSON inválido: se esperaba un objeto");
  }
  const p = payload as Partial<Cap2ExportV7>;
  if (p.version !== 7) {
    throw new Error(`Versión no soportada: ${String(p.version)} (esperado 7)`);
  }
  const introType: IntroType = p.introType === "MDIA" ? "MDIA" : "DIA";
  const utmZone: UtmZone =
    p.utmZone === "17S" || p.utmZone === "18S" || p.utmZone === "19S" ? p.utmZone : "19S";
  return {
    introType,
    utmZone,
    introFields: sanitizeStringMap(p.introFields),
    dgFields: sanitizeStringMap(p.dgFields),
    content: sanitizeStringMap(p.content),
  };
}

function sanitizeStringMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}
