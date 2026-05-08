// Auto-derive Capítulo 1 (Resumen Ejecutivo) prefill.
//
// The RE summarizes the rest of the DIA, so this derive function pulls
// from the same DB sources as Cap. 2 plus, on the client side, the user's
// saved Cap. 2 state in localStorage. This file runs on the server (SSR);
// the client editor merges Cap. 2 LS overrides on hydration.

import { centroidFromGeoJsonText } from "@/lib/dia/cap2/derive";
import { toUtm } from "@/lib/pdt/helpers";
import type {
  AreaEstudioRow,
  Cliente,
  ComponenteInventario,
  ComponentGeomFeature,
  Project,
} from "@/lib/types";
import type { ChapterState } from "@/lib/dia/framework/state";
import { utmZoneFromNumber } from "@/lib/dia/cap2/utm";

export interface DeriveCap1Input {
  project: Project;
  cliente: Cliente | null;
  componentes: readonly ComponenteInventario[];
  componentsGeom: readonly ComponentGeomFeature[];
  areaEstudio: AreaEstudioRow | null;
}

export interface DeriveCap1Result {
  state: ChapterState;
  warnings: string[];
}

const PLATAFORMA_RE = /plataforma|^pad\b/i;
const ACCESO_RE = /acceso|camino/i;

export function deriveCap1Prefill(input: DeriveCap1Input): DeriveCap1Result {
  const { project, cliente, componentes, componentsGeom, areaEstudio } = input;
  const warnings: string[] = [];

  // Counts (mirrors Cap. 2 logic, but we keep this independent so Cap. 1
  // can render even if Cap. 2 hasn't been touched yet).
  let numPlataformas = 0;
  let numSondajes = 0;
  const auxParts: string[] = [];
  for (const c of componentes) {
    if (PLATAFORMA_RE.test(c.componente)) {
      numPlataformas += c.cantidad;
      const sondajes = readNumberAttr(c.attrs, "sondajes");
      if (sondajes !== null) numSondajes += sondajes;
    } else if (!ACCESO_RE.test(c.componente)) {
      auxParts.push(`${formatCount(c.cantidad)} ${c.componente}`);
    }
  }

  let kmAccesos = 0;
  for (const g of componentsGeom) {
    if (!ACCESO_RE.test(g.tipo) && !ACCESO_RE.test(g.nombre)) continue;
    const m = g.longitud_tunel_m ?? 0;
    if (m) kmAccesos += m / 1000;
  }

  // Centroid → UTM E/N
  const centroid = centroidFromGeoJsonText(areaEstudio?.geom_geojson ?? null);
  let coordEste = "";
  let coordNorte = "";
  if (centroid) {
    try {
      const { easting, northing } = toUtm(centroid.lon, centroid.lat);
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

  // Concesiones from project.concesiones jsonb (best-effort)
  const concesiones = parseConcesiones(project.concesiones);
  const concesionesLista = concesiones.map((c) => formatConcesion(c)).join("\n");

  const dgFields: Record<string, string> = {
    re_visionGeneral: "",
    re_objetivoEstudio: "",
    re_lenguajeAdicional: "castellano (no hay otra lengua predominante en el AID)",
    re_distrito: project.distrito ?? "",
    re_provincia: project.provincia ?? "",
    re_region: project.region ?? "",
    re_coordEste: coordEste,
    re_coordNorte: coordNorte,
    re_utmZona: utmZoneFromNumber(project.zona_utm),
    re_areaEfectivaHa:
      areaEstudio && Number.isFinite(areaEstudio.area_ha)
        ? areaEstudio.area_ha.toFixed(2)
        : project.area_total_ha
          ? project.area_total_ha.toFixed(2)
          : "",
    re_numPlataformas: numPlataformas > 0 ? formatCount(numPlataformas) : "",
    re_numSondajes: numSondajes > 0 ? formatCount(numSondajes) : "",
    re_kmAccesos: kmAccesos > 0 ? kmAccesos.toFixed(3) : "",
    re_componentesAuxiliares: auxParts.join(", "),
    re_aiadHa: "",
    re_aiaiHa: "",
    re_aisdDescripcion: "",
    re_aisiDescripcion: "",
    re_numConcesiones: concesiones.length > 0 ? String(concesiones.length) : "",
    re_concesionesLista: concesionesLista,
    re_descripcionActividades: "",
    re_cronogramaMeses: "",
    re_resumenFisico: "",
    re_resumenBiologico: "",
    re_resumenSocial: "",
    re_mecanismosParticipacion: "",
    re_impactosResumen: "",
    re_pmaMedidas: "",
    re_cierre: "",
    re_postCierre: "",
    re_inversionTotalUSD: "",
    re_anpSuperposicion: "",
    re_anpNombre: "",
    re_anpDistanciaKm: "",
  };

  warnings.push(
    "El resumen de Línea Base se llena a mano por ahora; el Capítulo 3 (no implementado aún) lo poblará automáticamente.",
  );
  warnings.push(
    "Los mecanismos de participación, impactos y medidas del PMA se completan editando los Capítulos 4, 5 y 6 (no implementados aún).",
  );

  // Note: cliente is intentionally not surfaced in RE fields per RM 108
  // (titular details belong to Cap. 2). We accept it in input for symmetry.
  void cliente;

  return {
    state: { introFields: {}, dgFields, content: {} },
    warnings,
  };
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

function formatCount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

interface ParsedConcesion {
  nombre: string;
  codigo?: string;
  area_ha?: number;
}

function parseConcesiones(value: unknown): ParsedConcesion[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c) => ({
      nombre: typeof c.nombre === "string" ? c.nombre : "(sin nombre)",
      codigo: typeof c.codigo === "string" ? c.codigo : undefined,
      area_ha: typeof c.area_ha === "number" ? c.area_ha : undefined,
    }));
}

function formatConcesion(c: ParsedConcesion): string {
  const parts = [c.nombre];
  if (c.codigo) parts.push(`(${c.codigo})`);
  if (c.area_ha !== undefined) parts.push(`- ${c.area_ha.toFixed(0)} ha`);
  return parts.join(" ");
}
