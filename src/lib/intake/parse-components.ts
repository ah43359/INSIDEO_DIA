/**
 * Parse a components file into a normalized list of features in EPSG:4326.
 *
 * Supported formats:
 *   .csv      → columns: nombre, tipo, este, norte, [zona_utm, area_m2,
 *                longitud_tunel_m]; reprojected from UTM to 4326.
 *   .geojson  → FeatureCollection (any geometry); assumed 4326 per GeoJSON RFC.
 *   .kml      → KML doc; placemark name → nombre, ExtendedData/description → tipo.
 *   .kmz      → zip containing one .kml; same handling as .kml.
 *   .zip      → zipped shapefile (.shp/.shx/.dbf/.prj inside); reprojected to 4326
 *                via shpjs (uses .prj if present, otherwise assumed 4326).
 *
 * Polygons / lines are kept as-is for PostGIS — `lon`/`lat` is the centroid
 * (rough, for fitBounds and listing).
 */
import Papa from "papaparse";
import proj4 from "proj4";
import JSZip from "jszip";
import { kml as kmlToGeoJson } from "@tmcw/togeojson";
import { DOMParser } from "@xmldom/xmldom";
import shpRaw from "shpjs";

// shpjs exports a default function that takes ArrayBuffer (zip) and returns
// FeatureCollection or array of FeatureCollections. Types vary across versions.
const shp = shpRaw as unknown as (
  buf: ArrayBuffer,
) => Promise<GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[]>;

export interface ComponentFeature {
  nombre: string;
  tipo: string;
  categoria: string | null;
  area_m2: number;
  longitud_tunel_m: number;
  /** Centroid in EPSG:4326. */
  lon: number;
  lat: number;
  /** GeoJSON geometry in EPSG:4326. Point/LineString/Polygon all OK. */
  geometry: GeoJSON.Geometry;
}

const KNOWN_COMPONENT_TYPES: Record<string, string> = {
  plataforma: "Componente Principal",
  tajo: "Componente Principal",
  labor_subterranea: "Componente Principal",
  acceso: "Componente Auxiliar",
  campamento: "Componente Auxiliar",
  oficina: "Componente Auxiliar",
  almacen: "Componente Auxiliar",
  taller: "Componente Auxiliar",
  polvorin: "Componente Auxiliar",
};

/**
 * Heuristic mapping from a free-form name (e.g. "PF-01", "ACC-04",
 * "Plataforma 12") to one of our canonical `tipo` values. Used when the
 * source file lacks an explicit tipo attribute (typical for KMZ/SHP).
 */
function inferTipoFromName(name: string): string {
  const n = name.toLowerCase().trim();
  if (/^pf[-_ ]?\d+|plataform/.test(n)) return "plataforma";
  if (/^acc[-_ ]?\d+|acceso|camino|road|via/.test(n)) return "acceso";
  if (/^camp[-_ ]?\d+|campamento|camp\b/.test(n)) return "campamento";
  if (/^taj[-_ ]?\d+|tajo|pit/.test(n)) return "tajo";
  if (/^tun[-_ ]?\d+|^lab[-_ ]?\d+|tunel|labor.subt/.test(n))
    return "labor_subterranea";
  if (/poza/.test(n)) return "poza_sedimentacion";
  if (/heli|helipuert/.test(n)) return "helipuerto";
  if (/polvorin/.test(n)) return "polvorin";
  if (/almacen|bodega/.test(n)) return "almacen";
  if (/oficina/.test(n)) return "oficina";
  if (/taller/.test(n)) return "taller";
  if (/tanque/.test(n)) return "tanque_combustible";
  if (/generador/.test(n)) return "generador";
  if (/calicat/.test(n)) return "calicata";
  if (/trinchera/.test(n)) return "trinchera";
  if (/^pm[-_ ]?\d+|muestreo|chip|canal/.test(n)) return "muestreo_superficial";
  return "plataforma";
}

function utmEpsg(zone: number): string {
  if (![17, 18, 19].includes(zone)) {
    throw new Error(`Zona UTM no soportada: ${zone}. Use 17, 18 o 19 (sur).`);
  }
  return `EPSG:327${zone}`;
}

function ensureProjections(zone: number): void {
  const epsg = utmEpsg(zone);
  if (!proj4.defs(epsg)) {
    proj4.defs(
      epsg,
      `+proj=utm +zone=${zone} +south +datum=WGS84 +units=m +no_defs +type=crs`,
    );
  }
}

function inferCategoria(tipo: string): string | null {
  const t = tipo.toLowerCase().replace(/ /g, "_");
  return KNOWN_COMPONENT_TYPES[t] ?? null;
}

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v).trim();
}

function centroid(g: GeoJSON.Geometry): [number, number] {
  if (g.type === "Point") return g.coordinates as [number, number];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const visit = (coords: GeoJSON.Position[]): void => {
    for (const [x, y] of coords) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };
  if (g.type === "LineString" || g.type === "MultiPoint") visit(g.coordinates);
  else if (g.type === "Polygon" || g.type === "MultiLineString")
    g.coordinates.forEach(visit);
  else if (g.type === "MultiPolygon")
    g.coordinates.forEach((ring) => ring.forEach(visit));
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function approxAreaM2(g: GeoJSON.Geometry): number {
  // Rough planar area for Polygons/MultiPolygons in degrees → m² via the
  // local cosine projection. Adequate for the frontend's display heuristic;
  // PostGIS will compute the exact value when needed.
  if (g.type !== "Polygon" && g.type !== "MultiPolygon") return 0;
  const rings: GeoJSON.Position[][] =
    g.type === "Polygon" ? g.coordinates : g.coordinates.flat();
  let area = 0;
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const refLat = (ring[0][1] * Math.PI) / 180;
    const k = Math.cos(refLat);
    let s = 0;
    for (let i = 0, n = ring.length; i < n; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[(i + 1) % n];
      s += x1 * k * y2 - x2 * k * y1;
    }
    area += Math.abs(s) / 2;
  }
  // s is in degrees² × cos(lat); convert to m² via 111_320 m/deg.
  return area * 111_320 * 111_320;
}

// ── CSV ─────────────────────────────────────────────────────────────────

function parseCsv(text: string, declaredZonaUtm: number): ComponentFeature[] {
  ensureProjections(declaredZonaUtm);
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors.length > 0) {
    throw new Error(`CSV inválido: ${result.errors[0].message}`);
  }
  const required = ["nombre", "tipo", "este", "norte"];
  const headers = result.meta.fields ?? [];
  const missing = required.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    throw new Error(`Faltan columnas en el CSV: ${missing.join(", ")}.`);
  }

  const features: ComponentFeature[] = [];
  for (const row of result.data) {
    const este = num(row.este);
    const norte = num(row.norte);
    if (este === 0 && norte === 0) continue;
    const rowZone = num(row.zona_utm, declaredZonaUtm);
    ensureProjections(rowZone);
    const epsg = utmEpsg(rowZone);
    const [lon, lat] = proj4(epsg, "EPSG:4326", [este, norte]);
    const tipo = str(row.tipo).toLowerCase().replace(/ /g, "_");
    features.push({
      nombre: str(row.nombre),
      tipo,
      categoria: inferCategoria(tipo),
      area_m2: num(row.area_m2),
      longitud_tunel_m: num(row.longitud_tunel_m),
      lon,
      lat,
      geometry: { type: "Point", coordinates: [lon, lat] },
    });
  }
  return features;
}

// ── GeoJSON ─────────────────────────────────────────────────────────────

function parseGeoJson(text: string): ComponentFeature[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`GeoJSON inválido: ${(e as Error).message}`);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { type?: string }).type !== "FeatureCollection"
  ) {
    throw new Error("GeoJSON debe ser una FeatureCollection.");
  }
  return featureCollectionToComponents(parsed as GeoJSON.FeatureCollection);
}

// ── KML / KMZ ───────────────────────────────────────────────────────────

function parseKmlText(kmlText: string): GeoJSON.FeatureCollection {
  const dom = new DOMParser().parseFromString(kmlText, "text/xml");
  // togeojson's `kml` accepts a Document. We cast to the lib's expected shape;
  // @xmldom is API-compatible at the level togeojson exercises.
  const fc = kmlToGeoJson(dom as unknown as Document);
  return fc as GeoJSON.FeatureCollection;
}

async function parseKmz(buffer: ArrayBuffer): Promise<ComponentFeature[]> {
  const zip = await JSZip.loadAsync(buffer);
  const kmlEntry = Object.values(zip.files).find(
    (f) => !f.dir && f.name.toLowerCase().endsWith(".kml"),
  );
  if (!kmlEntry) {
    throw new Error("KMZ no contiene ningún archivo .kml.");
  }
  const kmlText = await kmlEntry.async("string");
  return featureCollectionToComponents(parseKmlText(kmlText));
}

function parseKml(text: string): ComponentFeature[] {
  return featureCollectionToComponents(parseKmlText(text));
}

// ── Shapefile zip ───────────────────────────────────────────────────────

async function parseShapefileZip(
  buffer: ArrayBuffer,
): Promise<ComponentFeature[]> {
  let result: GeoJSON.FeatureCollection | GeoJSON.FeatureCollection[];
  try {
    result = await shp(buffer);
  } catch (e) {
    throw new Error(
      `Shapefile no se pudo leer: ${(e as Error).message}. ` +
        `Verifica que el .zip contenga .shp + .shx + .dbf (y .prj si no es 4326).`,
    );
  }
  const all: GeoJSON.Feature[] = [];
  const collections = Array.isArray(result) ? result : [result];
  for (const fc of collections) {
    if (fc?.features) all.push(...fc.features);
  }
  if (all.length === 0) {
    throw new Error("El shapefile no contiene features.");
  }
  return featureCollectionToComponents({
    type: "FeatureCollection",
    features: all,
  });
}

// ── Common: GeoJSON FeatureCollection → ComponentFeature[] ──────────────

function featureCollectionToComponents(
  fc: GeoJSON.FeatureCollection,
): ComponentFeature[] {
  const features: ComponentFeature[] = [];
  let i = 0;
  for (const f of fc.features) {
    i += 1;
    if (!f.geometry) continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const rawNombre = str(
      props.nombre ?? props.Nombre ?? props.name ?? props.NAME ?? props.Name,
      `COMP-${String(i).padStart(3, "0")}`,
    );
    const rawTipo = str(
      props.tipo ?? props.Tipo ?? props.TIPO ?? props.type ?? props.Type,
      "",
    );
    const tipo = (
      rawTipo ? rawTipo : inferTipoFromName(rawNombre)
    )
      .toLowerCase()
      .replace(/ /g, "_");
    const explicitArea = num(props.area_m2 ?? props.Area_m2 ?? props.AREA_M2 ?? props.area);
    const area_m2 = explicitArea > 0 ? explicitArea : approxAreaM2(f.geometry);
    const [lon, lat] = centroid(f.geometry);
    features.push({
      nombre: rawNombre,
      tipo,
      categoria: inferCategoria(tipo),
      area_m2,
      longitud_tunel_m: num(
        props.longitud_tunel_m ?? props.LONG_TUNEL_M ?? props.tunel_m,
      ),
      lon,
      lat,
      geometry: f.geometry,
    });
  }
  return features;
}

// ── Public dispatcher ───────────────────────────────────────────────────

export interface ParseComponentsOptions {
  filename: string;
  declaredZonaUtm: number;
}

export async function parseComponents(
  buffer: ArrayBuffer,
  opts: ParseComponentsOptions,
): Promise<ComponentFeature[]> {
  const ext = opts.filename.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "csv":
      return parseCsv(new TextDecoder("utf-8").decode(buffer), opts.declaredZonaUtm);
    case "geojson":
    case "json":
      return parseGeoJson(new TextDecoder("utf-8").decode(buffer));
    case "kml":
      return parseKml(new TextDecoder("utf-8").decode(buffer));
    case "kmz":
      return parseKmz(buffer);
    case "zip":
      return parseShapefileZip(buffer);
    case "shp":
      throw new Error(
        "Sube el shapefile como .zip que contenga al menos .shp, .shx y .dbf (y .prj si no es 4326).",
      );
    default:
      throw new Error(
        `Formato no soportado: .${ext}. Usa .csv, .geojson, .kml, .kmz o .zip (shapefile).`,
      );
  }
}
