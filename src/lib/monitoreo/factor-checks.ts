/**
 * Factor-aware ECA / exceedance helpers.
 *
 * The exceedance and ECA-display logic was previously duplicated inside
 * MonitoreoMatrix. This module centralizes both so the matrix highlighting
 * and the Resumen step's exceedance summary stay in lock-step.
 */

import {
  AGUA_MULTI_PARAMS,
  AGUA_SUB_PARAMS,
  AIRE_PARAMS,
  FACTOR_DEFS,
  FACTOR_DEFS_MAP,
  RUIDO_PARAMS,
  SEDIMENTOS_PARAMS,
  SUELOS_PARAMS,
  type AguaCategory,
  type FactorDef,
  type FactorKind,
  type NoiseZone,
  type SoilCategory,
} from "./eca-registry";
import {
  exceedsAguaMulti,
  exceedsAir,
  exceedsGroundwater,
  exceedsRuido,
  exceedsSuelos,
} from "./exceedance";

export interface FactorSelectors {
  aguaCat?: AguaCategory;
  ruidoZone?: NoiseZone;
  suelosCat?: SoilCategory;
}

const DEFAULT_SELECTORS: Required<FactorSelectors> = {
  aguaCat: "cat3r",
  ruidoZone: "zi",
  suelosCat: "ind",
};

function withDefaults(s: FactorSelectors | undefined): Required<FactorSelectors> {
  return { ...DEFAULT_SELECTORS, ...(s ?? {}) };
}

/** Display string for a parameter's ECA threshold given the active selectors. */
export function getEcaDisplay(
  factor: FactorKind,
  paramId: string,
  selectors?: FactorSelectors,
): string {
  const sel = withDefaults(selectors);
  switch (factor) {
    case "aire": {
      const p = AIRE_PARAMS.find((x) => x.id === paramId);
      return p?.eca != null ? String(p.eca) : "–";
    }
    case "agua_superficial": {
      const p = AGUA_MULTI_PARAMS.find((x) => x.id === paramId);
      return p?.thresholds[sel.aguaCat] ?? "–";
    }
    case "agua_subterranea": {
      const p = AGUA_SUB_PARAMS.find((x) => x.id === paramId);
      return p?.eca ?? "–";
    }
    case "ruido": {
      const p = RUIDO_PARAMS.find((x) => x.id === paramId);
      return p?.thresholds[sel.ruidoZone] ?? "–";
    }
    case "suelos": {
      const p = SUELOS_PARAMS.find((x) => x.id === paramId);
      return p?.thresholds[sel.suelosCat] ?? "–";
    }
    case "sedimentos": {
      const p = SEDIMENTOS_PARAMS.find((x) => x.id === paramId);
      return p?.eca != null ? String(p.eca) : "–";
    }
    case "flora":
    case "fauna":
    case "vida_acuatica":
    case "rni":
    default:
      return "–";
  }
}

/** True if the raw measured value exceeds the active ECA for this parameter. */
export function checkExceeds(
  factor: FactorKind,
  paramId: string,
  raw: string | number | undefined | null,
  selectors?: FactorSelectors,
): boolean {
  const sel = withDefaults(selectors);
  switch (factor) {
    case "aire": {
      const p = AIRE_PARAMS.find((x) => x.id === paramId);
      return exceedsAir(raw, p?.eca ?? null);
    }
    case "agua_superficial": {
      const p = AGUA_MULTI_PARAMS.find((x) => x.id === paramId);
      if (!p) return false;
      const threshold = p.thresholds[sel.aguaCat] ?? p.thresholds.cat3r;
      return exceedsAguaMulti(raw, threshold, "gt");
    }
    case "agua_subterranea": {
      const p = AGUA_SUB_PARAMS.find((x) => x.id === paramId);
      if (!p) return false;
      return exceedsGroundwater(raw, p.eca, p.compare_op);
    }
    case "ruido": {
      const p = RUIDO_PARAMS.find((x) => x.id === paramId);
      if (!p) return false;
      return exceedsRuido(raw, p.thresholds, sel.ruidoZone);
    }
    case "suelos": {
      const p = SUELOS_PARAMS.find((x) => x.id === paramId);
      if (!p) return false;
      return exceedsSuelos(raw, p.thresholds, sel.suelosCat);
    }
    case "sedimentos": {
      const p = SEDIMENTOS_PARAMS.find((x) => x.id === paramId);
      return exceedsAir(raw, p?.eca ?? null);
    }
    case "flora":
    case "fauna":
    case "vida_acuatica":
    case "rni":
    default:
      return false;
  }
}

export interface ParamMeta {
  id: string;
  name: string;
  unit: string;
  on: boolean;
  period: string;
}

/** Active (on=true) parameters for a given factor — flat list of names + units. */
export function getActiveParams(factor: FactorKind): ParamMeta[] {
  switch (factor) {
    case "aire":
      return AIRE_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, on: p.on, period: p.period,
      }));
    case "agua_superficial":
      return AGUA_MULTI_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, on: p.on, period: p.period,
      }));
    case "agua_subterranea":
      return AGUA_SUB_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, on: p.on, period: p.period,
      }));
    case "ruido":
      return RUIDO_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, on: p.on, period: p.period,
      }));
    case "suelos":
      return SUELOS_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, on: p.on, period: p.period,
      }));
    case "sedimentos":
      return SEDIMENTOS_PARAMS.filter((p) => p.on).map((p) => ({
        id: p.id, name: p.name, unit: p.unit, on: p.on, period: p.period,
      }));
    case "flora":
    case "fauna":
    case "vida_acuatica":
    case "rni":
    default:
      return [];
  }
}

export interface ExceedanceItem {
  stationCode: string;
  paramId: string;
  paramName: string;
  unit: string;
  value: string;
  ecaDisplay: string;
}

/**
 * Walk the results matrix and collect every (station, param) cell where the
 * value exceeds its ECA. Returns items in matrix-traversal order.
 */
export function summarizeExceedances(args: {
  factor: FactorKind;
  stationCodes: string[];
  results: Record<string, Record<string, string | number>>;
  selectors?: FactorSelectors;
}): ExceedanceItem[] {
  const { factor, stationCodes, results, selectors } = args;
  const params = getActiveParams(factor);
  const out: ExceedanceItem[] = [];
  for (const code of stationCodes) {
    const stationResults = results[code] ?? {};
    for (const p of params) {
      const raw = stationResults[p.id];
      if (raw == null || String(raw).trim() === "") continue;
      if (!checkExceeds(factor, p.id, raw, selectors)) continue;
      out.push({
        stationCode: code,
        paramId: p.id,
        paramName: p.name,
        unit: p.unit,
        value: String(raw),
        ecaDisplay: getEcaDisplay(factor, p.id, selectors),
      });
    }
  }
  return out;
}

export interface CompletenessStats {
  filled: number;
  total: number;
  ratio: number; // 0..1
}

/**
 * Cell count: number of (station × active param) intersections that have a
 * non-empty measured value, vs. the total possible.
 */
export function computeCompleteness(args: {
  factor: FactorKind;
  stationCodes: string[];
  results: Record<string, Record<string, string | number>>;
}): CompletenessStats {
  const { factor, stationCodes, results } = args;
  const params = getActiveParams(factor);
  const total = stationCodes.length * params.length;
  if (total === 0) return { filled: 0, total: 0, ratio: 0 };
  let filled = 0;
  for (const code of stationCodes) {
    const stationResults = results[code] ?? {};
    for (const p of params) {
      const raw = stationResults[p.id];
      if (raw != null && String(raw).trim() !== "") filled += 1;
    }
  }
  return { filled, total, ratio: filled / total };
}

// ── Required-completeness (Cap 3 DIA gate) ────────────────────────────────────

/**
 * Completeness against the **minParameters** declared in `FACTOR_DEFS`. The
 * Cap 3 DIA isn't considered "data-complete" for a factor until every station
 * has every minimum parameter measured.
 *
 * For taxonomic factors (flora / fauna / vida_acuática) `minParameters` is
 * empty — completeness collapses to "at least one station with at least one
 * record" (handled by callers via `stationsCount > 0 && filled > 0`).
 */
export function computeRequiredCompleteness(args: {
  factor: FactorKind;
  stationCodes: string[];
  results: Record<string, Record<string, string | number>>;
}): CompletenessStats {
  const { factor, stationCodes, results } = args;
  const def = FACTOR_DEFS_MAP[factor];
  const minParams = def?.minParameters ?? [];

  if (minParams.length === 0) {
    // Taxonomic / qualitative factor — ratio = stations with any record.
    if (stationCodes.length === 0) return { filled: 0, total: 0, ratio: 0 };
    let stationsWithData = 0;
    for (const code of stationCodes) {
      const stationResults = results[code] ?? {};
      if (Object.keys(stationResults).length > 0) stationsWithData += 1;
    }
    return {
      filled: stationsWithData,
      total: stationCodes.length,
      ratio: stationCodes.length === 0 ? 0 : stationsWithData / stationCodes.length,
    };
  }

  const total = stationCodes.length * minParams.length;
  if (total === 0) return { filled: 0, total: 0, ratio: 0 };
  let filled = 0;
  for (const code of stationCodes) {
    const stationResults = results[code] ?? {};
    for (const paramId of minParams) {
      const raw = stationResults[paramId];
      if (raw != null && String(raw).trim() !== "") filled += 1;
    }
  }
  return { filled, total, ratio: filled / total };
}

/**
 * Status of a factor against the Cap 3 baseline requirement.
 *
 * Used to drive the per-card badge and the "factores requeridos pendientes"
 * top-banner on `/projects/[id]/monitoreo`.
 */
export type FactorReadiness =
  | "not_required"          // factor.required === 'optional'
  | "conditional_unused"     // factor.required === 'conditional' && stationsCount === 0
  | "missing_stations"        // factor.required === 'always' && stationsCount === 0
  | "missing_measurements"   // stations exist, but no measurements yet
  | "partial"                 // some min-params measured, but not all
  | "complete";               // all min-params on every station have data

export function factorReadiness(args: {
  factor: FactorKind;
  stationsCount: number;
  stationCodes: string[];
  results: Record<string, Record<string, string | number>>;
}): FactorReadiness {
  const { factor, stationsCount, stationCodes, results } = args;
  const def = FACTOR_DEFS_MAP[factor];
  const required = def?.required ?? "optional";

  if (required === "optional") return "not_required";
  if (stationsCount === 0) {
    return required === "always" ? "missing_stations" : "conditional_unused";
  }

  const stats = computeRequiredCompleteness({ factor, stationCodes, results });
  if (stats.filled === 0) return "missing_measurements";
  if (stats.ratio >= 1) return "complete";
  return "partial";
}

/**
 * Walk the factor stats map and return the FactorDefs whose `required === 'always'`
 * have zero stations. These are the factors the consultant still needs to set up
 * before the Cap 3 baseline can be considered "designed".
 */
export function missingAlwaysRequiredFactors(
  factorStats: Map<FactorKind, { stationsCount: number }>,
): FactorDef[] {
  return FACTOR_DEFS.filter((f) => {
    if (f.required !== "always") return false;
    const s = factorStats.get(f.id);
    return !s || s.stationsCount === 0;
  });
}
