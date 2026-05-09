/**
 * Import mapper — fuzzy column matching for CSV/XLSX data imports.
 * Adapted from the standalone baseline-quality-dashboards' simStr() function.
 * Supports two orientations:
 * - "cols": stations in header row, params in first column
 * - "rows": params in header row, stations in first column
 */

export interface ColumnMapping {
  stationCode: string;
  campaign: string;
  date: string;
  param: string;
  value: string;
  unit: string;
  description: string;
}

const ALIASES: Record<keyof ColumnMapping, string[]> = {
  stationCode: [
    "station_code", "stationcode", "station-code", "codigo", "cod",
    "cod_est", "estacion", "station", "codigo_estacion", "station_id",
    "cod_estacion", "code", "sta_code", "sta",
  ],
  campaign: [
    "campaign", "campana", "camp", "campa", "tipo_campana",
    "tipo_campaign", "muestreo", "tipo_muestreo", "fase",
  ],
  date: [
    "fecha", "date", "fech", "fecha_medicion", "fecha_muestreo",
    "measurement_date", "sampling_date", "fecha_date", "dia",
  ],
  param: [
    "parametro", "param", "parameter", "parameters", "param_name",
    "parametro_nombre", "name", "parameter_name", "contaminante",
    "constituyente", "variable",
  ],
  value: [
    "valor", "value", "val", "resultado", "measurement", "medicion",
    "concentracion", "concentration", "result", "reading",
  ],
  unit: [
    "unidad", "unit", "units", "um", "mg_l", "ug_m3", "dba",
    "param_unit", "unit_name",
  ],
  description: [
    "descripcion", "description", "desc", "obs", "observacion",
    "observation", "nota", "note", "notas",
  ],
};

function simStr(a: string, b: string): number {
  const wa = a.toLowerCase().split(/[\s_-]+/);
  const wb = b.toLowerCase().split(/[\s_-]+/);
  if (a.toLowerCase() === b.toLowerCase()) return 1;
  if (wa.some((t) => wb.some((u) => u.startsWith(t) || t.startsWith(u)))) return 0.85;
  if (wb.some((t) => wa.some((u) => u.startsWith(t) || t.startsWith(u)))) return 0.85;
  const common = wa.filter((t) => wb.some((u) => u.includes(t) || t.includes(u)));
  return (common.length / Math.max(wa.length, wb.length)) * 0.7;
}

export interface DetectedColumns {
  stationCode: number;
  campaign: number | null;
  date: number | null;
  param: number;
  value: number;
  unit: number | null;
  description: number | null;
}

export function detectColumns(header: string[]): DetectedColumns | null {
  const scores: Partial<Record<keyof ColumnMapping, { idx: number; score: number }>> = {};

  header.forEach((col, idx) => {
    for (const [key, aliases] of Object.entries(ALIASES)) {
      const k = key as keyof ColumnMapping;
      if (scores[k]) continue;
      let bestScore = 0;
      for (const alias of aliases) {
        const s = simStr(col, alias);
        if (s > bestScore) bestScore = s;
      }
      if (bestScore > 0.5) {
        scores[k] = { idx, score: bestScore };
      }
    }
  });

  const stationCode = scores.stationCode?.idx;
  const param = scores.param?.idx;
  const value = scores.value?.idx;

  if (stationCode == null || param == null || value == null) return null;

  return {
    stationCode,
    param,
    value,
    campaign: scores.campaign?.idx ?? null,
    date: scores.date?.idx ?? null,
    unit: scores.unit?.idx ?? null,
    description: scores.description?.idx ?? null,
  };
}

export type ImportOrientation = "cols" | "rows";

export interface ImportRow {
  stationCode: string;
  campaign: string;
  date: string;
  param: string;
  value: string;
  unit: string;
  description: string;
}

export function parseImportData(
  rows: string[][],
  orientation: ImportOrientation,
): ImportRow[] {
  const header = rows[0];
  const detected = detectColumns(header);
  if (!detected) return [];

  if (orientation === "cols") {
    return parseColsOrientation(rows, detected);
  } else {
    return parseRowsOrientation(rows, detected);
  }
}

function parseColsOrientation(
  rows: string[][],
  cols: DetectedColumns,
): ImportRow[] {
  const result: ImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const param = (row[cols.param] || "").trim();
    const value = (row[cols.value] || "").trim();
    if (!param || !value) continue;

    for (let j = 1; j < row.length; j++) {
      if (j === cols.param || j === cols.value) continue;
      const stationCode = (rows[0][j] || "").trim();
      if (!stationCode) continue;
      const v = (row[j] || "").trim();
      if (!v) continue;
      result.push({
        stationCode,
        campaign: cols.campaign != null ? (row[cols.campaign] || "").trim() : "",
        date: cols.date != null ? (row[cols.date] || "").trim() : "",
        param,
        value: v,
        unit: cols.unit != null ? (row[cols.unit] || "").trim() : "",
        description: cols.description != null ? (row[cols.description] || "").trim() : "",
      });
    }
  }
  return result;
}

function parseRowsOrientation(
  rows: string[][],
  cols: DetectedColumns,
): ImportRow[] {
  const result: ImportRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    const stationCode = (row[cols.stationCode] || "").trim();
    if (!stationCode) continue;
    for (let j = 1; j < row.length; j++) {
      const param = (rows[0][j] || "").trim();
      if (!param) continue;
      const value = (row[j] || "").trim();
      if (!value) continue;
      result.push({
        stationCode,
        campaign: cols.campaign != null ? (row[cols.campaign] || "").trim() : "",
        date: cols.date != null ? (row[cols.date] || "").trim() : "",
        param,
        value,
        unit: cols.unit != null ? (row[cols.unit] || "").trim() : "",
        description: cols.description != null ? (row[cols.description] || "").trim() : "",
      });
    }
  }
  return result;
}

export function detectOrientation(rows: string[][]): ImportOrientation {
  if (rows.length < 2) return "cols";
  const header = rows[0];
  const detected = detectColumns(header);
  if (!detected) return "cols";

  // Heuristic: if first non-stationCode column header looks like a station code
  // (short, alphanumeric), it's "cols"; otherwise "rows"
  for (let i = 1; i < header.length; i++) {
    const h = header[i]?.trim() ?? "";
    if (/^[A-Z]{2,4}[-_]?\d{1,3}$/i.test(h)) return "cols";
  }
  return "rows";
}
