// Auto-derive Capítulo 2 prefill from existing project data.
//
// This is the bridge layer between insideo-dia's data model
// (`componente_inventario`, `components_geom`, `projects`, `clientes`,
// `area_estudio`) and the Cap. 2 template's expected `introFields` /
// `dgFields`. The standalone HTML template only handles manual entry; this
// is the value-add that justifies embedding the editor in insideo-dia.

import { toUtm } from "@/lib/pdt/helpers";
import type {
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
  AreaEstudioRow,
} from "@/lib/types";
import type { Cap2State, IntroType, UtmZone } from "./state";
import { utmZoneFromNumber } from "./utm";

export interface DerivePrefillInput {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export interface DerivePrefillResult {
  state: Cap2State;
  warnings: string[];
}

// Component name buckets, evaluated in declared order. First match wins —
// "auxiliary" terms (helipuerto, piscina, ...) come before generic
// "plataforma" so e.g. "Plataforma de helipuerto" buckets as helipuerto.
type Bucket =
  | "helipuerto"
  | "piscina"
  | "trinchera"
  | "manguera"
  | "pase"
  | "patio"
  | "plataforma"
  | "sondaje"
  | "acceso"
  | "other";

interface BucketRule {
  bucket: Bucket;
  pattern: RegExp;
}

const BUCKET_RULES: readonly BucketRule[] = [
  { bucket: "helipuerto", pattern: /helipuerto|heli\b/i },
  { bucket: "piscina", pattern: /piscina|poza/i },
  { bucket: "trinchera", pattern: /trinchera/i },
  { bucket: "manguera", pattern: /manguera/i },
  { bucket: "pase", pattern: /pase\b|pase\s+vehicular/i },
  { bucket: "patio", pattern: /patio/i },
  { bucket: "plataforma", pattern: /plataforma|^pad\b/i },
  { bucket: "sondaje", pattern: /sondaje|sondeo|\bdhh\b|\bddh\b/i },
  { bucket: "acceso", pattern: /acceso|camino/i },
];

function classify(componente: string): Bucket {
  for (const rule of BUCKET_RULES) {
    if (rule.pattern.test(componente)) return rule.bucket;
  }
  return "other";
}

function readNumberAttr(attrs: Record<string, unknown> | null, key: string): number | null {
  if (!attrs) return null;
  const v = attrs[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readStringAttr(attrs: Record<string, unknown> | null, key: string): string | null {
  if (!attrs) return null;
  const v = attrs[key];
  return typeof v === "string" ? v : null;
}

interface PolygonCentroid {
  lon: number;
  lat: number;
}

// Naive centroid: mean of all distinct outer-ring vertices across polygons.
// Adequate for "approximate project center" usage; not survey-grade.
export function centroidFromGeoJsonText(geom: string | null): PolygonCentroid | null {
  if (!geom) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(geom);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const g = parsed as { type?: string; coordinates?: unknown };

  const points: [number, number][] = [];
  const addRing = (ring: unknown) => {
    if (!Array.isArray(ring)) return;
    for (const pt of ring) {
      if (Array.isArray(pt) && typeof pt[0] === "number" && typeof pt[1] === "number") {
        points.push([pt[0], pt[1]]);
      }
    }
  };

  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    const outer = g.coordinates[0];
    addRing(outer);
  } else if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    for (const poly of g.coordinates) {
      if (Array.isArray(poly) && Array.isArray(poly[0])) addRing(poly[0]);
    }
  } else if (g.type === "Point" && Array.isArray(g.coordinates)) {
    const [lon, lat] = g.coordinates;
    if (typeof lon === "number" && typeof lat === "number") return { lon, lat };
  }

  if (points.length === 0) return null;
  let sumLon = 0;
  let sumLat = 0;
  for (const [lon, lat] of points) {
    sumLon += lon;
    sumLat += lat;
  }
  return { lon: sumLon / points.length, lat: sumLat / points.length };
}

function formatNumber(n: number, decimals: number): string {
  return n.toFixed(decimals);
}

function formatCount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function deriveCap2Prefill(input: DerivePrefillInput): DerivePrefillResult {
  const { project, cliente, componentes, componentsGeom, areaEstudio } = input;
  const warnings: string[] = [];

  // ── DIA vs MDIA detection ───────────────────────────────────────────
  const introType: IntroType =
    project.iga_previo != null || project.proyecto_brownfield === true ? "MDIA" : "DIA";

  const utmZone: UtmZone = utmZoneFromNumber(project.zona_utm);

  // ── Component classification ────────────────────────────────────────
  let numPlataformas = 0;
  let numSondajes = 0;
  let platAprobadas = 0;
  let platReubicadas = 0;
  let sawAttrEstado = false;
  const auxiliarParts: string[] = [];

  for (const c of componentes) {
    const bucket = classify(c.componente);
    const cantidad = Number.isFinite(c.cantidad) ? c.cantidad : 0;
    const estado = readStringAttr(c.attrs, "estado");
    if (estado) sawAttrEstado = true;

    if (bucket === "plataforma") {
      numPlataformas += cantidad;
      const sondajesAttr = readNumberAttr(c.attrs, "sondajes");
      if (sondajesAttr !== null) numSondajes += sondajesAttr;
      if (estado === "aprobado") platAprobadas += cantidad;
      else if (estado === "reubicado") platReubicadas += cantidad;
    } else if (bucket === "sondaje") {
      // Standalone sondaje rows (rare but possible)
      numSondajes += cantidad;
    } else if (bucket === "acceso") {
      // accesos drive km from geometry below; only auxiliary listing here if no
      // matching geom feature exists, handled separately
    } else {
      // Auxiliary infrastructure: helipuerto, piscina, trinchera, manguera,
      // pase, patio, other → goes into auxiliarList as "{cantidad} {componente}".
      // We preserve the user's wording verbatim (no automatic pluralization)
      // since reviewers expect the exact terminology used in the inventory.
      auxiliarParts.push(`${formatCount(cantidad)} ${c.componente}`);
      if (bucket === "other") {
        warnings.push(
          `Componente "${c.componente}" no coincide con ninguna categoría conocida; se incluyó en "Infraestructura auxiliar".`,
        );
      }
    }
  }

  // ── Accesos length from geometry ────────────────────────────────────
  let kmAccesosAprobados = 0;
  let kmAccesosNuevos = 0;
  let kmAccesosTotal = 0;
  for (const g of componentsGeom) {
    if (!/acceso|camino/i.test(g.tipo) && !/acceso|camino/i.test(g.nombre)) continue;
    const meters = g.longitud_tunel_m ?? 0;
    if (!meters) continue;
    kmAccesosTotal += meters / 1000;
    // We don't have direct attrs on components_geom rows, but we can match by
    // nombre back to componente_inventario for estado tagging. For now this
    // is a best-effort split — refine when components_geom carries attrs.
    const matched = componentes.find((c) => c.componente === g.nombre);
    const estado = matched ? readStringAttr(matched.attrs, "estado") : null;
    if (estado === "aprobado") kmAccesosAprobados += meters / 1000;
    else kmAccesosNuevos += meters / 1000;
  }

  // ── Centroid → UTM Easting/Northing ─────────────────────────────────
  const centroidLatLon = centroidFromGeoJsonText(areaEstudio?.geom_geojson ?? null);
  let coordEste = "";
  let coordNorte = "";
  if (centroidLatLon) {
    try {
      const { easting, northing } = toUtm(centroidLatLon.lon, centroidLatLon.lat);
      coordEste = String(Math.round(easting));
      coordNorte = String(Math.round(northing));
    } catch {
      warnings.push("No se pudo proyectar el centroide del área de estudio a UTM.");
    }
  } else if (areaEstudio === null) {
    warnings.push(
      'Aún no hay "área de estudio" para este proyecto. Las coordenadas Este/Norte deben ingresarse manualmente.',
    );
  }

  // ── MDIA-only warnings ──────────────────────────────────────────────
  if (introType === "MDIA" && !sawAttrEstado) {
    warnings.push(
      'Marca cada componente con `attrs.estado` (aprobado / reubicado / nuevo) en el inventario para auto-llenar los campos delta de MDIA (plataformas aprobadas/reubicadas, km accesos aprobados/nuevos).',
    );
  }

  // ── Build introFields ───────────────────────────────────────────────
  const projectName = project.nombre_proyecto;
  const introFields: Record<string, string> = {
    nombreProyecto: projectName,
    abrevProyecto: introType === "MDIA" ? `MDIA "${projectName}"` : `DIA "${projectName}"`,
    empresaTitular: cliente?.razon_social ?? "",
    abrevEmpresa: "",
    coordEste,
    coordNorte,
    distrito: project.distrito ?? "",
    provincia: project.provincia ?? "",
    region: project.region ?? "",
    numPlataformas: numPlataformas > 0 ? formatCount(numPlataformas) : "",
    numSondajes: numSondajes > 0 ? formatCount(numSondajes) : "",
    kmAccesos: kmAccesosTotal > 0 ? formatNumber(kmAccesosTotal, 3) : "",
    auxiliarList: auxiliarParts.join(", "),
  };

  if (introType === "MDIA") {
    introFields.platAprobadas = platAprobadas > 0 ? formatCount(platAprobadas) : "";
    introFields.platReubicadas = platReubicadas > 0 ? formatCount(platReubicadas) : "";
    introFields.kmAccesosAprobados = kmAccesosAprobados > 0 ? formatNumber(kmAccesosAprobados, 3) : "";
    introFields.kmAccesosNuevos = kmAccesosNuevos > 0 ? formatNumber(kmAccesosNuevos, 3) : "";
    introFields.rdAprobacion = "";
    introFields.abrevDIA = `DIA "${projectName}"`;
  }

  // ── Build dgFields (project + client metadata mirror) ───────────────
  const dgFields: Record<string, string> = {
    dg_nombreProyecto: projectName,
    dg_distrito: project.distrito ?? "",
    dg_provincia: project.provincia ?? "",
    dg_region: project.region ?? "",
    dg_empresaNombre: cliente?.razon_social ?? "",
    dg_empresaAbrev: "",
    dg_ruc: cliente?.ruc ?? "",
    dg_direccion: cliente?.domicilio ?? "",
    dg_repNombre: cliente?.representante ?? "",
    dg_repCargo: cliente?.cargo ?? "",
    dg_repDNI: cliente?.dni_representante ?? "",
    dg_tipoEstudio:
      introType === "MDIA"
        ? "Modificación de la Declaración de Impacto Ambiental (MDIA – Categoría I)"
        : "Declaración de Impacto Ambiental (DIA – Categoría I)",
  };

  if (centroidLatLon && coordEste && coordNorte) {
    dgFields.loc_centroideEste = coordEste;
    dgFields.loc_centroideNorte = coordNorte;
  }

  if (areaEstudio && Number.isFinite(areaEstudio.area_ha)) {
    dgFields.del_areaTotalHa = formatNumber(areaEstudio.area_ha, 2);
  }

  return {
    state: {
      introType,
      utmZone,
      introFields,
      dgFields,
      content: {},
    },
    warnings,
  };
}

