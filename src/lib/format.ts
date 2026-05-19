/**
 * Deterministic Spanish-style formatters for numbers and dates.
 *
 * Why this module exists
 * ----------------------
 * Calling `n.toLocaleString("es-PE", ...)` or `d.toLocaleDateString("es-PE")`
 * in code that renders during SSR is a hydration-mismatch trap: Node ships
 * with limited ICU data and falls back to en-US-style formatting ("208.0"
 * with a dot decimal), while the browser has full ICU and produces real
 * Spanish output ("208,0" with a comma decimal). When the same component
 * is rendered on both sides during hydration, React detects the text
 * mismatch and discards the server HTML.
 *
 * These helpers produce identical output on Node and in the browser
 * because they avoid the platform Intl APIs entirely. They follow Peru's
 * "1.234,5" convention (period thousands separator, comma decimal).
 */

const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const EM_DASH = "—";

// ── Numbers ────────────────────────────────────────────────────────────

/** Parse anything to a finite number, else null. */
function toFiniteNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const v = typeof input === "number" ? input : Number(input);
  return Number.isFinite(v) ? v : null;
}

/** Insert thousands separator (period) into an integer string. */
function withThousands(intDigits: string): string {
  // Walk from the right inserting "." every 3 digits.
  const neg = intDigits.startsWith("-");
  const digits = neg ? intDigits.slice(1) : intDigits;
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ".";
    out += digits[i];
  }
  return neg ? "-" + out : out;
}

export interface FormatNumberOptions {
  /** Number of digits after the decimal separator (default 0). */
  decimals?: number;
  /** Whether to include thousands separators (default true). */
  thousands?: boolean;
  /** Fallback string when the value isn't a finite number (default "—"). */
  fallback?: string;
}

/**
 * Spanish-Peruvian number formatting: period thousands, comma decimal.
 *
 *   formatNumber(1234.5, { decimals: 1 })            // "1.234,5"
 *   formatNumber(0.42, { decimals: 2 })              // "0,42"
 *   formatNumber(1234, { thousands: false })         // "1234"
 *   formatNumber(null)                               // "—"
 */
export function formatNumber(
  value: unknown,
  opts: FormatNumberOptions = {},
): string {
  const { decimals = 0, thousands = true, fallback = EM_DASH } = opts;
  const v = toFiniteNumber(value);
  if (v === null) return fallback;
  const fixed = v.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const intOut = thousands ? withThousands(intPart) : intPart;
  return decPart ? `${intOut},${decPart}` : intOut;
}

/** Hectares with 1 decimal by default: `12.345,6`. */
export function formatHa(value: unknown, decimals = 1): string {
  return formatNumber(value, { decimals });
}

/** Integer count with thousands separator: `12.345`. */
export function formatInt(value: unknown): string {
  return formatNumber(value, { decimals: 0 });
}

// ── Dates ──────────────────────────────────────────────────────────────

/** Coerce to a valid Date or null. Accepts Date, ISO string, or epoch ms. */
function toDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") return null;
  const d = input instanceof Date ? input : new Date(input as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Date in DD/MM/YYYY form. Returns "—" for invalid input.
 *
 *   formatDate("2026-05-18T13:24:00Z")  // "18/05/2026"
 */
export function formatDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return EM_DASH;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Date + 24-hour time: DD/MM/YYYY HH:MM. Returns "—" for invalid input.
 *
 *   formatDateTime("2026-05-18T13:24:00Z")  // "18/05/2026 13:24"
 */
export function formatDateTime(value: unknown): string {
  const d = toDate(value);
  if (!d) return EM_DASH;
  const date = formatDate(d);
  return `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * Long Spanish date for documents: "18 de mayo de 2026".
 */
export function formatLongDate(value: unknown): string {
  const d = toDate(value);
  if (!d) return EM_DASH;
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()}`;
}
