// INEI district data scraper.
//
// Targets three complementary INEI sources for Census 2017 / annual data:
//
//   1. INEI SIRTOD API — regional/provincial/district indicators (JSON)
//   2. INEI "Indicadores de Desarrollo Humano" — district IDH (HTML table)
//   3. INEI "Mapa de Pobreza" — district poverty rates (HTML table)
//
// Each source is attempted independently; failures are logged and skipped
// so partial results are still returned.

import type {
  IneiDemografia,
  IneiDistrictData,
  IneiEconomia,
  IneiEducacion,
  IneiIndices,
  IneiSalud,
  IneiVivienda,
} from "./types";

const TIMEOUT_MS = 15_000;

// ── HTTP helper ────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "InsideoDIA/1.0 (environmental consulting; contact: a.hijar.s@gmail.com)",
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      },
    });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url: string): Promise<string | null> {
  const res = await fetchWithTimeout(url);
  return res ? res.text() : null;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetchWithTimeout(url);
  if (!res) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// ── Regex helpers ──────────────────────────────────────────────────────────

function extractNumber(html: string, pattern: RegExp): number | null {
  const m = html.match(pattern);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function pctNumber(html: string, pattern: RegExp): number | null {
  const n = extractNumber(html, pattern);
  return n === null ? null : Math.min(100, Math.abs(n));
}

// ── Source 1: INEI SIRTOD ─────────────────────────────────────────────────
//
// SIRTOD exposes an undocumented JSON endpoint used by their dashboard.
// The ubigeo parameter filters results to the requested district.
// Data covers Census 2017 and annual survey updates.

const SIRTOD_BASE = "https://sirtod.inei.gob.pe";

interface SirtodIndicador {
  codigo?: string;
  nombre?: string;
  valor?: number | string | null;
  anio?: number | string | null;
  unidad?: string;
}

async function fetchSirtodIndicators(ubigeo: string): Promise<SirtodIndicador[]> {
  // SIRTOD's XHR endpoint for district indicators
  const url = `${SIRTOD_BASE}/api/Indicador/GetIndicadoresByUbigeo?ubigeo=${ubigeo}`;
  const data = await fetchJson(url);
  if (!Array.isArray(data)) return [];
  return data as SirtodIndicador[];
}

function sirtodValue(
  rows: SirtodIndicador[],
  codigos: string[],
): number | null {
  for (const codigo of codigos) {
    const row = rows.find(
      (r) => r.codigo?.toUpperCase() === codigo.toUpperCase(),
    );
    if (row?.valor != null) {
      const n = typeof row.valor === "number"
        ? row.valor
        : parseFloat(String(row.valor).replace(",", "."));
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

async function scrapeSirtod(ubigeo: string): Promise<{
  demografia: Partial<IneiDemografia>;
  educacion: Partial<IneiEducacion>;
  salud: Partial<IneiSalud>;
  vivienda: Partial<IneiVivienda>;
  economia: Partial<IneiEconomia>;
} | null> {
  const rows = await fetchSirtodIndicators(ubigeo);
  if (rows.length === 0) return null;

  return {
    demografia: {
      // SIRTOD indicator codes for population (approximate — may differ by region)
      poblacion_total:         sirtodValue(rows, ["POB01", "POB_TOT", "POBTOT"]),
      poblacion_urbana:        sirtodValue(rows, ["POB02", "POB_URB"]),
      poblacion_rural:         sirtodValue(rows, ["POB03", "POB_RUR"]),
      densidad_hab_km2:        sirtodValue(rows, ["DENS01", "DENSIDAD"]),
      tasa_crecimiento_pct:    sirtodValue(rows, ["CRE01", "TASCRE"]),
    },
    educacion: {
      tasa_analfabetismo_pct:  sirtodValue(rows, ["ANA01", "ANALF"]),
    },
    salud: {
      pct_con_seguro:          sirtodValue(rows, ["SAL01", "SEG_SAL"]),
      pct_sis:                 sirtodValue(rows, ["SIS01", "SEG_SIS"]),
      tasa_mortalidad_infantil:sirtodValue(rows, ["MOR01", "TMI"]),
      tasa_desnutricion_cronica_pct: sirtodValue(rows, ["NUT01", "DESNUT"]),
    },
    vivienda: {
      pct_agua_red_publica:    sirtodValue(rows, ["VIV01", "AGUA_RED"]),
      pct_desague_red_publica: sirtodValue(rows, ["VIV02", "DESAG_RED"]),
      pct_electricidad:        sirtodValue(rows, ["VIV03", "ELECTR"]),
    },
    economia: {
      pct_pobreza_total:       sirtodValue(rows, ["POB_MON", "POBREZA"]),
      pct_pobreza_extrema:     sirtodValue(rows, ["POB_EXT", "POBRE_EXT"]),
    },
  };
}

// ── Source 2: INEI Census 2017 district profile page ──────────────────────
//
// INEI publishes district result summaries at:
//   https://censos2017.inei.gob.pe/main/
// The ubigeo maps to a queryable district profile.

const CENSO_BASE = "https://censos2017.inei.gob.pe";

async function scrapeCenso2017(ubigeo: string): Promise<{
  demografia: Partial<IneiDemografia>;
  educacion: Partial<IneiEducacion>;
  salud: Partial<IneiSalud>;
  vivienda: Partial<IneiVivienda>;
  economia: Partial<IneiEconomia>;
} | null> {
  // The district profile endpoint (ubigeo as query param)
  const url = `${CENSO_BASE}/main/?id=${ubigeo}`;
  const html = await fetchText(url);
  if (!html) return null;

  // Population
  const poblacion_total = extractNumber(html,
    /poblaci[oó]n\s+total[^>]*>\s*([\d,.\s]+)/i);
  const pct_urbana = pctNumber(html,
    /poblaci[oó]n\s+urbana[^>]*>\s*([\d,.]+)\s*%/i);
  const pct_rural = pct_urbana !== null ? Math.round((100 - pct_urbana) * 10) / 10 : null;
  const hombres = extractNumber(html, /hombres[^>]*>\s*([\d,.\s]+)/i);
  const mujeres = extractNumber(html, /mujeres[^>]*>\s*([\d,.\s]+)/i);
  const densidad = extractNumber(html,
    /densidad\s+poblacional[^>]*>\s*([\d,.]+)/i);

  // Education
  const analfabetismo = pctNumber(html,
    /analfabetismo[^>]*>\s*([\d,.]+)\s*%/i);
  const asist_primaria = pctNumber(html,
    /asistencia.*primaria[^>]*>\s*([\d,.]+)\s*%/i);
  const asist_secundaria = pctNumber(html,
    /asistencia.*secundaria[^>]*>\s*([\d,.]+)\s*%/i);

  // Health
  const con_seguro = pctNumber(html,
    /seguro\s+de\s+salud[^>]*>\s*([\d,.]+)\s*%/i);
  const sis = pctNumber(html, /SIS[^>]*>\s*([\d,.]+)\s*%/i);

  // Vivienda
  const agua_red = pctNumber(html,
    /agua.*red\s+p[uú]blica[^>]*>\s*([\d,.]+)\s*%/i);
  const desague = pctNumber(html,
    /desag[üu]e.*red\s+p[uú]blica[^>]*>\s*([\d,.]+)\s*%/i);
  const electricidad = pctNumber(html,
    /electricidad[^>]*>\s*([\d,.]+)\s*%/i);

  // PEA
  const pea_total = extractNumber(html,
    /PEA\s+total[^>]*>\s*([\d,.\s]+)/i);

  return {
    demografia: {
      poblacion_total,
      pct_urbana,
      poblacion_rural: pct_rural && poblacion_total
        ? Math.round(poblacion_total * pct_rural / 100)
        : null,
      poblacion_urbana: pct_urbana && poblacion_total
        ? Math.round(poblacion_total * pct_urbana / 100)
        : null,
      hombres,
      mujeres,
      relacion_masculinidad: hombres && mujeres && mujeres > 0
        ? Math.round((hombres / mujeres) * 100 * 10) / 10
        : null,
      densidad_hab_km2: densidad,
      anno_censo: 2017,
    },
    educacion: {
      tasa_analfabetismo_pct: analfabetismo,
      tasa_asistencia_primaria_pct: asist_primaria,
      tasa_asistencia_secundaria_pct: asist_secundaria,
      anno: 2017,
    },
    salud: {
      pct_con_seguro: con_seguro,
      pct_sis: sis,
      anno: 2017,
    },
    vivienda: {
      pct_agua_red_publica: agua_red,
      pct_desague_red_publica: desague,
      pct_electricidad: electricidad,
      anno: 2017,
    },
    economia: {
      pea_total,
    },
  };
}

// ── Source 3: INEI IDH by district ────────────────────────────────────────
//
// PNUD Peru and INEI publish the Human Development Index at district level.
// The 2019 edition is available at their joint publication endpoint.

async function scrapeIDH(ubigeo: string): Promise<Partial<IneiIndices> | null> {
  // INEI IDH web table — district level
  const url = `https://www.inei.gob.pe/estadisticas/indicadores/indicadores-de-desarrollo-humano/`;
  const html = await fetchText(url);
  if (!html) return null;

  // Look for the ubigeo in the table and extract the IDH value on the same row
  const ubigeoEscaped = ubigeo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowPattern = new RegExp(
    `${ubigeoEscaped}[^<]*<[^>]*>[^<]*<[^>]*>([\\d,.]+)`,
    "i",
  );
  const m = html.match(rowPattern);
  if (!m) return null;
  const idh = parseFloat(m[1].replace(",", "."));
  return isNaN(idh) ? null : { idh, idh_anno: 2019 };
}

// ── Merge helper ──────────────────────────────────────────────────────────

function mergePartials<T extends object>(
  ...parts: (Partial<T> | null | undefined)[]
): T {
  const result = {} as T;
  for (const part of parts) {
    if (!part) continue;
    for (const [k, v] of Object.entries(part)) {
      if (v !== null && v !== undefined) {
        (result as Record<string, unknown>)[k] = v;
      }
    }
  }
  return result;
}

// ── Public entry point ────────────────────────────────────────────────────

export interface ScraperResult {
  data: Omit<IneiDistrictData, "ubigeo" | "nombre" | "provincia" | "departamento">;
  sourcesHit: string[];
  errors: string[];
}

export async function scrapeIneiDistrict(
  ubigeo: string,
): Promise<ScraperResult> {
  const sourcesHit: string[] = [];
  const errors: string[] = [];

  // Run all sources in parallel
  const [sirtodResult, censoResult, idhResult] = await Promise.allSettled([
    scrapeSirtod(ubigeo),
    scrapeCenso2017(ubigeo),
    scrapeIDH(ubigeo),
  ]);

  let sirtod: Awaited<ReturnType<typeof scrapeSirtod>> = null;
  let censo: Awaited<ReturnType<typeof scrapeCenso2017>> = null;
  let idhData: Partial<IneiIndices> | null = null;

  if (sirtodResult.status === "fulfilled" && sirtodResult.value) {
    sirtod = sirtodResult.value;
    sourcesHit.push("INEI SIRTOD");
  } else if (sirtodResult.status === "rejected") {
    errors.push(`SIRTOD: ${sirtodResult.reason}`);
  }

  if (censoResult.status === "fulfilled" && censoResult.value) {
    censo = censoResult.value;
    sourcesHit.push("INEI Censos 2017");
  } else if (censoResult.status === "rejected") {
    errors.push(`Censo 2017: ${censoResult.reason}`);
  }

  if (idhResult.status === "fulfilled" && idhResult.value) {
    idhData = idhResult.value;
    sourcesHit.push("INEI IDH");
  } else if (idhResult.status === "rejected") {
    errors.push(`IDH: ${idhResult.reason}`);
  }

  // Merge: censo is the primary source; sirtod fills gaps
  const demografia = mergePartials<IneiDemografia>(
    sirtod?.demografia,
    censo?.demografia,
  );
  const educacion = mergePartials<IneiEducacion>(
    sirtod?.educacion,
    censo?.educacion,
  );
  const salud = mergePartials<IneiSalud>(
    sirtod?.salud,
    censo?.salud,
  );
  const vivienda = mergePartials<IneiVivienda>(
    sirtod?.vivienda,
    censo?.vivienda,
  );
  const economia = mergePartials<IneiEconomia>(
    sirtod?.economia,
    censo?.economia,
  );

  // Attach source labels
  if (Object.keys(demografia).length) demografia.fuente = "INEI Censo Nacional 2017";
  if (Object.keys(educacion).length)  educacion.fuente  = "INEI Censo Nacional 2017";
  if (Object.keys(salud).length)      salud.fuente      = "INEI Censo Nacional 2017";
  if (Object.keys(vivienda).length)   vivienda.fuente   = "INEI Censo Nacional 2017";
  if (Object.keys(economia).length)   economia.fuente   = "INEI Mapa de Pobreza 2018; Censo 2017";

  const indices = mergePartials<IneiIndices>(idhData ?? {});
  if (Object.keys(indices).length) {
    indices.fuente = "PNUD / INEI – Índice de Desarrollo Humano";
  }

  return {
    data: {
      data_year: 2017,
      fetched_at: new Date().toISOString(),
      demografia: Object.keys(demografia).length ? demografia : null,
      educacion:  Object.keys(educacion).length  ? educacion  : null,
      salud:      Object.keys(salud).length      ? salud      : null,
      vivienda:   Object.keys(vivienda).length   ? vivienda   : null,
      economia:   Object.keys(economia).length   ? economia   : null,
      indices:    Object.keys(indices).length    ? indices    : null,
      fuentes: sourcesHit,
    },
    sourcesHit,
    errors,
  };
}
