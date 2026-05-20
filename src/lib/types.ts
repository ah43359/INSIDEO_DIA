// Shapes of the rows we read from Supabase. Matches schema in init_rfi_schema.

export interface Cliente {
  id: string;
  razon_social: string;
  ruc: string;
  domicilio: string | null;
  representante: string;
  dni_representante: string | null;
  cargo: string | null;
  telefono: string | null;
  correo: string | null;
}

export interface Project {
  id: string;
  cliente_id: string;
  nombre_proyecto: string;
  codigo_cm: string | null;
  region: string;
  provincia: string;
  distrito: string;
  area_total_ha: number | null;
  zona_utm: number;
  datum: string | null;
  commodity: string[] | null;
  metodo_exploracion: string[] | null;
  proyecto_brownfield: boolean;
  iga_previo: Record<string, unknown> | null;
  concesiones: Record<string, unknown>[] | null;
  recursos: Record<string, unknown> | null;
  residuos: Record<string, unknown> | null;
  mano_obra: Record<string, unknown> | null;
  cronograma: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithCliente extends Project {
  clientes: Pick<Cliente, "razon_social" | "ruc">;
}

export interface ComponenteInventario {
  id: string;
  project_id: string;
  categoria: string;
  componente: string;
  cantidad: number;
  attrs: Record<string, unknown> | null;
}

export interface ComponentGeomFeature {
  id: string;
  project_id: string;
  nombre: string;
  tipo: string;
  categoria: string | null;
  area_m2: number | null;
  longitud_tunel_m: number | null;
  /** WKT or GeoJSON; we'll request as GeoJSON via st_asgeojson. */
  geom_geojson: string | null;
}

export interface RfiSubmission {
  id: string;
  project_id: string;
  raw_rfi: Record<string, unknown>;
  validation_report: string | null;
  declared_platforms: number | null;
  actual_platforms: number | null;
  declared_area_ha: number | null;
  computed_area_ha: number | null;
  schema_ok: boolean | null;
  components_ingested: boolean | null;
  warnings: string[] | null;
  errors: string[] | null;
  rfi_xlsx_path: string | null;
  components_file_path: string | null;
  submitted_at: string;
}

// ─── Área efectiva (project footprint + small buffer) ────────────────
//
// Smallest polygon enclosing all components, computed on-the-fly via
// PostGIS. Distinct from the área de estudio (regulatory polygon) and
// the área de influencia (impact-driven polygon, computed later).

export interface AreaEfectivaRow {
  /** GeoJSON Polygon as text (from st_asgeojson). */
  geom_geojson: string;
  area_ha: number;
  buffer_m: number;
  components_count: number;
  /** 'auto' = hull+buffer, 'edited' = user-edited vertices, 'manual' = uploaded. */
  source: "auto" | "edited" | "manual";
  /** True when components were added/edited after the polygon was generated. */
  is_stale: boolean;
}

// ─── Área de estudio (baseline-sampling polygon) ──────────────────────
//
// NOT to be confused with área de influencia (AID/AII). Área de
// influencia is impact-based and computed in a later phase.

export interface MicrocuencaRow {
  id: number;
  pfafstetter: string;
  nombre: string | null;
  nivel: number;
  area_km2: number | null;
  /** GeoJSON Geometry (string from st_asgeojson). */
  geom_geojson: string;
}

/** Catchment polygon associated with a Strahler-2+ river, from get_strahler_catchments_for_project. */
export type StrahlerCatchmentRow = MicrocuencaRow;

export type AreaEstudioStatus = "draft" | "approved" | "superseded";
export type AreaEstudioGeneratedBy = "auto" | "manual";

export interface AreaEstudioInputsSnapshot {
  project_id: string;
  components_count: number;
  strategy?: string;
  crs_utm: string;
  // subbasin_envelope fields
  target_area_ha?: number | null;
  stream_threshold_cells?: number | null;
  max_hops?: number | null;
  n_subbasins_used?: number | null;
  hops_used?: number | null;
  // buffer_drainage fields
  microcuencas_used_pfafstetter?: string[];
  microcuencas_skipped_pfafstetter?: string[];
  max_microcuenca_area_km2?: number | null;
  receptor_buffer_m?: number;
  drainage_provider?: string;
  // microcuenca_selection fields
  microcuencas_selected_ids?: number[];
  microcuencas_selected_pfafstetter?: string[];
  microcuencas_count?: number;
  // between_control_points fields
  upstream_min_distance_m?: number;
  downstream_min_distance_m?: number;
  upstream_catchment_point?: { x: number; y: number; receiving_river_nombre?: string | null; confluent_river_nombre?: string | null } | null;
  downstream_catchment_point?: { x: number; y: number; receiving_river_nombre?: string | null; confluent_river_nombre?: string | null } | null;
  method?: string;
}

export type CatchmentPointKind = "upstream" | "downstream";

/**
 * Confluence anchor for hydrographic monitoring. A project can have up to
 * two: an `upstream` baseline reference (≥ 2 km upstream of área efectiva)
 * and a `downstream` impact-reference (≥ 5 km downstream). Computed
 * offline by `skills/reference-layers/scripts/compute_catchment_point.py`
 * and stored in `public.project_catchment_points`.
 */
export interface CatchmentPointRow {
  kind: CatchmentPointKind;
  /** GeoJSON Point as text. */
  geom_geojson: string;
  receiving_river_id: number | null;
  receiving_river_nombre: string | null;
  receiving_strahler: number | null;
  confluent_river_id: number | null;
  confluent_river_nombre: string | null;
  confluent_strahler: number | null;
  /** Total flow-path distance from project centroid to catchment point (m). */
  path_length_m: number | null;
  /** Distance along the flow path from the AE polygon exit to the catchment point (m). */
  distance_from_ae_m: number | null;
  /** Minimum-distance threshold used at compute time (m). */
  min_distance_m: number | null;
  used_neighbour_districts: boolean;
  computed_at: string;
}

export interface RiverRow {
  id: number;
  source_id: string;
  nombre: string | null;
  length_km: number | null;
  strahler_order: number | null;
  /** GeoJSON MultiLineString as text. */
  geom_geojson: string;
}

// ─── Receptores sensibles + sampling stations ──────────────────────

export interface CentroPobladoRow {
  id: number;
  nombre: string;
  ubigeo: string | null;
  categoria_poblado: string | null;
  categoria_admin: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  /** GeoJSON Point as text. */
  geom_geojson: string;
  inside_area_estudio: boolean;
}

export type SamplingDiscipline = "fisico" | "biologico" | "social";
export type SamplingKind =
  | "aire"
  | "ruido"
  | "vibraciones"
  | "agua_superficial"
  | "agua_subterranea"
  | "suelos"
  | "sedimentos";

export interface SamplingStationRow {
  id: string;
  status: "draft" | "approved" | "superseded";
  discipline: SamplingDiscipline;
  kind: SamplingKind | string;
  station_code: string;
  rationale: string | null;
  parameters: string[] | null;
  target_receptor_id: number | null;
  target_receptor_nombre: string | null;
  generated_at: string;
  /** GeoJSON Point as text. */
  geom_geojson: string;
}

// ─── Concesiones mineras (INGEMMET Geocatmin) ─────────────────────────

export interface ConcesionRow {
  id: number;
  codigo: string;
  nombre: string;
  titular: string | null;
  area_ha: number | null;
  estado: string | null;
  tipo: string | null;
  fecha_titulo: string | null;
  is_own: boolean;
  /** GeoJSON MultiPolygon as text. */
  geom_geojson: string;
}

export interface AreaEstudioRow {
  id: string;
  status: AreaEstudioStatus;
  area_ha: number;
  generated_by: AreaEstudioGeneratedBy;
  generated_at: string;
  approved_at: string | null;
  inputs_snapshot: AreaEstudioInputsSnapshot;
  /** GeoJSON MultiPolygon as text. */
  geom_geojson: string;
}

// ─── Station Measurements ───────────────────────────────────────────────────

export type MeasurementCampaign = "linea_base" | "construccion" | "operacion" | "cierre";

export interface StationMeasurement {
  id: string;
  station_id: string;
  station_code: string;
  kind: string;
  campaign: MeasurementCampaign;
  measurement_date: string;
  parameters: Record<string, { value: number; unit: string }>;
  eca_compliance: Record<string, { compliant: boolean; threshold: number; value: number }> | null;
  notes: string | null;
  created_at: string;
}

export interface StationWithMeasurement {
  station_id: string;
  station_code: string;
  kind: string;
  has_measurements: boolean;
  last_measurement_date: string | null;
  compliance_rate: number | null;
}

export const CAMPAIGN_LABEL: Record<MeasurementCampaign, string> = {
  linea_base: "Línea Base",
  construccion: "Construcción",
  operacion: "Operación",
  cierre: "Cierre",
};

export const KIND_LABEL: Record<string, string> = {
  aire: "Calidad de Aire",
  ruido: "Ruido",
  vibraciones: "Vibraciones",
  agua_superficial: "Agua Superficial",
  agua_subterranea: "Agua Subterránea",
  suelos: "Suelos",
  sedimentos: "Sedimentos",
  flora_fauna: "Flora y Fauna",
};

// Parameters by station kind (from ECA Peru standards)
export const PARAMETERS_BY_KIND: Record<string, { param: string; unit: string }[]> = {
  aire: [
    { param: "PM10", unit: "μg/m³" },
    { param: "PM2.5", unit: "μg/m³" },
    { param: "SO2", unit: "μg/m³" },
    { param: "NO2", unit: "μg/m³" },
    { param: "CO", unit: "μg/m³" },
    { param: "O3", unit: "μg/m³" },
    { param: "Pb", unit: "μg/m³" },
  ],
  ruido: [
    { param: "LAeq diurno", unit: "dB(A)" },
    { param: "LAeq nocturno", unit: "dB(A)" },
    { param: "L10 diurno", unit: "dB(A)" },
    { param: "L10 nocturno", unit: "dB(A)" },
  ],
  vibraciones: [
    { param: "PPV", unit: "mm/s" },
    { param: "frecuencia", unit: "Hz" },
  ],
  agua_superficial: [
    { param: "pH", unit: "-" },
    { param: "OD", unit: "mg/L" },
    { param: "conductividad", unit: "μS/cm" },
    { param: "turbidez", unit: "NTU" },
    { param: "DBO5", unit: "mg/L" },
    { param: "DQO", unit: "mg/L" },
    { param: "Pb", unit: "mg/L" },
    { param: "As", unit: "mg/L" },
    { param: "Cd", unit: "mg/L" },
    { param: "Cu", unit: "mg/L" },
    { param: "Fe", unit: "mg/L" },
    { param: "Hg", unit: "mg/L" },
    { param: "Zn", unit: "mg/L" },
  ],
  agua_subterranea: [
    { param: "pH", unit: "-" },
    { param: "OD", unit: "mg/L" },
    { param: "conductividad", unit: "μS/cm" },
    { param: "Pb", unit: "mg/L" },
    { param: "As", unit: "mg/L" },
    { param: "Cd", unit: "mg/L" },
  ],
  suelos: [
    { param: "pH", unit: "-" },
    { param: "materia_organica", unit: "%" },
    { param: "textura", unit: "-" },
    { param: "CIC", unit: "cmol/kg" },
    { param: "P_disponible", unit: "mg/kg" },
    { param: "K_intercambiable", unit: "cmol/kg" },
    { param: "Pb", unit: "mg/kg" },
    { param: "As", unit: "mg/kg" },
    { param: "Cd", unit: "mg/kg" },
    { param: "Cu", unit: "mg/kg" },
    { param: "Zn", unit: "mg/kg" },
  ],
  sedimentos: [
    { param: "granulometria", unit: "%" },
    { param: "materia_organica", unit: "%" },
    { param: "Pb", unit: "mg/kg" },
    { param: "As", unit: "mg/kg" },
    { param: "Cd", unit: "mg/kg" },
    { param: "Cu", unit: "mg/kg" },
    { param: "Zn", unit: "mg/kg" },
  ],
};

export const STATION_COLORS: Record<string, string> = {
  aire: "#10b981",
  ruido: "#a855f7",
  vibraciones: "#ef4444",
  agua_superficial: "#0ea5e9",
  agua_subterranea: "#0284c7",
  suelos: "#a16207",
  sedimentos: "#854d0e",
  default: "#1f2937",
};

/** Friendly Spanish labels for component category keys. */
export const CATEGORY_LABELS: Record<string, string> = {
  A_exploracion_directa: "A. Exploración directa",
  B_infraestructura_lineal: "B. Infraestructura lineal",
  C_auxiliares: "C. Auxiliares",
  D_gestion_aguas: "D. Gestión de aguas",
  E_residuos_y_materiales: "E. Residuos y materiales",
  F_energia_y_combustibles: "F. Energía y combustibles",
  G_otros: "G. Otros",
};
