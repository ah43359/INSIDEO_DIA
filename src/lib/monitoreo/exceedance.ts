/**
 * Exceedance detection — determines if a measured value exceeds its ECA threshold.
 * Handles all factor types: standard ">", "≥" for OD, range for pH.
 */

import type {
  AguaCategory,
  CompareOp,
  NoiseZone,
  SoilCategory,
} from "./eca-registry";

function parseValue(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "" || s === "–" || s === "<") return null;
  return parseFloat(s.replace(",", "."));
}

function parseRange(raw: string): [number, number] | null {
  // Accept both en-dash and hyphen as separators, tolerate whitespace.
  const normalized = raw.replace(/–/g, "-").replace(/\s+/g, " ").trim();
  const parts = normalized.split("-").map((p) => p.trim());
  if (parts.length !== 2) return null;
  const lo = parseValue(parts[0]);
  const hi = parseValue(parts[1]);
  if (lo == null || hi == null) return null;
  return [lo, hi];
}

/** Standard single-threshold exceedance (e.g. PM10 > 100) */
export function exceedsSingle(
  rawValue: string | number | null | undefined,
  threshold: number | null,
): boolean {
  if (threshold == null) return false;
  const v = parseValue(rawValue);
  if (v == null) return false;
  return v > threshold;
}

/** Range exceedance (e.g. pH outside 6.5–8.5) */
export function exceedsRange(
  rawValue: string | number | null | undefined,
  rangeRaw: string,
): boolean {
  const v = parseValue(rawValue);
  if (v == null) return false;
  const range = parseRange(rangeRaw);
  if (!range) return false;
  return v < range[0] || v > range[1];
}

/** "≥ threshold" exceedance — the *lower* the value, the worse (e.g. OD < 4 = exceedance) */
export function exceedsGTE(
  rawValue: string | number | null | undefined,
  thresholdRaw: string,
): boolean {
  const v = parseValue(rawValue);
  if (v == null) return false;
  const threshold = parseValue(thresholdRaw.replace("≥", "").trim());
  if (threshold == null) return false;
  return v < threshold;
}

/** Generic exceedance by compare_op string */
export function exceedsByOp(
  rawValue: string | number | null | undefined,
  thresholdRaw: string,
  compareOp: CompareOp,
): boolean {
  const v = parseValue(rawValue);
  if (v == null) return false;

  switch (compareOp) {
    case "none":
      return false;
    case "range":
      return exceedsRange(rawValue, thresholdRaw);
    case "lt": {
      const t = parseValue(thresholdRaw);
      if (t == null) return false;
      return v < t;
    }
    case "lte": {
      const t = parseValue(thresholdRaw);
      if (t == null) return false;
      return v <= t;
    }
    case "gte": {
      const t = parseValue(thresholdRaw);
      if (t == null) return false;
      return v >= t;
    }
    case "gt":
    default:
      return exceedsSingle(rawValue, parseValue(thresholdRaw));
  }
}

/** Air / Sediments / simple params: standard ">" comparison */
export function exceedsAir(
  rawValue: string | number | null | undefined,
  threshold: number | null,
): boolean {
  return exceedsSingle(rawValue, threshold);
}

/** Groundwater params: handle range and ≥ special cases */
export function exceedsGroundwater(
  rawValue: string | number | null | undefined,
  thresholdRaw: string,
  compareOp: CompareOp,
): boolean {
  return exceedsByOp(rawValue, thresholdRaw, compareOp);
}

/** Water multi-column params (D1/D2, Cat1, Cat4).
 *
 * Auto-detects comparison from the threshold string format because the
 * EcaParamMulti registry does not carry a compare_op field per row:
 *   - "–" or ""  → no threshold, never exceeds
 *   - "≥ X"      → "≥ X" lower bound; values below X are exceedances (e.g. OD)
 *   - "A – B"    → range; values outside [A, B] are exceedances (e.g. pH)
 *   - "X"        → standard ">"; values above X are exceedances
 * The `compareOp` arg is retained as an override fallback.
 */
export function exceedsAguaMulti(
  rawValue: string | number | null | undefined,
  thresholdRaw: string,
  compareOp: CompareOp,
): boolean {
  if (thresholdRaw === "–" || thresholdRaw === "") return false;
  if (thresholdRaw.startsWith("≥")) return exceedsGTE(rawValue, thresholdRaw);
  // A range threshold contains an en-dash or hyphen between two numbers.
  if (/\d\s*[-–]\s*\d/.test(thresholdRaw)) return exceedsRange(rawValue, thresholdRaw);
  return exceedsByOp(rawValue, thresholdRaw, compareOp);
}

/** Noise: pick threshold by zone */
export function exceedsRuido(
  rawValue: string | number | null | undefined,
  thresholds: Record<NoiseZone, string>,
  zone: NoiseZone,
): boolean {
  const raw = thresholds[zone];
  if (!raw || raw === "–") return false;
  return exceedsSingle(rawValue, parseValue(raw));
}

/** Soil: pick threshold by category */
export function exceedsSuelos(
  rawValue: string | number | null | undefined,
  thresholds: Record<SoilCategory, string>,
  category: SoilCategory,
): boolean {
  const raw = thresholds[category];
  if (!raw || raw === "–") return false;
  return exceedsSingle(rawValue, parseValue(raw));
}

/** Result cell: { exceeds: boolean, value: string, display: string } */
export interface ExceedanceResult {
  exceeds: boolean;
  value: string;
  display: string; // formatted display value
}

export function formatValue(raw: string | number | null | undefined): string {
  if (raw == null) return "–";
  const s = String(raw).trim();
  if (s === "" || s === "–") return "–";
  const n = parseValue(s);
  if (n == null) return s;
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

export function cellColor(
  exceeds: boolean,
  hasValue: boolean,
): { bg: string; border: string; text: string } {
  if (!hasValue) return { bg: "transparent", border: "#d4d4d4", text: "#6b7280" };
  if (exceeds) return { bg: "#FEF2F2", border: "#fca5a5", text: "#991b1b" };
  return { bg: "#F0FDF4", border: "#86efac", text: "#166534" };
}
