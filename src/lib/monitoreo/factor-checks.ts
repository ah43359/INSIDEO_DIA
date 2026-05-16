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
  RUIDO_PARAMS,
  SEDIMENTOS_PARAMS,
  SUELOS_PARAMS,
  type AguaCategory,
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
      // exceedsAguaMulti auto-detects "range" / "lt" / "gt" from the threshold
      // string format (e.g. "6,5 – 8,5" → range, "≥ 4" → lt, "0,1" → gt).
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
