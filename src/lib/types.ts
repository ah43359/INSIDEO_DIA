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
