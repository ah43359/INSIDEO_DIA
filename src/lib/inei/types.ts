// Types for INEI district-level social baseline data.
// Mirrors the jsonb columns in public.inei_district_data.

export interface IneiDemografia {
  poblacion_total: number | null;
  poblacion_urbana: number | null;
  poblacion_rural: number | null;
  pct_urbana: number | null;
  hombres: number | null;
  mujeres: number | null;
  relacion_masculinidad: number | null; // hombres / mujeres * 100
  densidad_hab_km2: number | null;
  // Age groups (%)
  pct_0_14: number | null;
  pct_15_64: number | null;
  pct_65_mas: number | null;
  // Intercensal growth rate (%)
  tasa_crecimiento_pct: number | null;
  anno_censo: number | null;
  fuente: string | null;
}

export interface IneiEducacion {
  tasa_analfabetismo_pct: number | null;       // 15+ who cannot read/write
  tasa_asistencia_primaria_pct: number | null;
  tasa_asistencia_secundaria_pct: number | null;
  pct_sin_nivel_educativo: number | null;
  pct_primaria: number | null;
  pct_secundaria: number | null;
  pct_superior: number | null;
  anno: number | null;
  fuente: string | null;
}

export interface IneiSalud {
  pct_con_seguro: number | null;         // any insurance
  pct_sis: number | null;                // Seguro Integral de Salud
  pct_essalud: number | null;
  tasa_mortalidad_infantil: number | null; // per 1,000 live births
  tasa_desnutricion_cronica_pct: number | null; // children < 5
  n_establecimientos_salud: number | null;
  anno: number | null;
  fuente: string | null;
}

export interface IneiVivienda {
  n_viviendas: number | null;
  pct_agua_red_publica: number | null;
  pct_desague_red_publica: number | null;
  pct_electricidad: number | null;
  pct_pared_material_noble: number | null;
  pct_piso_cemento_o_mejor: number | null;
  anno: number | null;
  fuente: string | null;
}

export interface IneiEconomia {
  pea_total: number | null;
  pea_ocupada: number | null;
  pct_sector_primario: number | null;    // agro, pesca, minería
  pct_sector_secundario: number | null;  // manufactura, construcción
  pct_sector_terciario: number | null;   // comercio, servicios
  pct_pobreza_total: number | null;
  pct_pobreza_extrema: number | null;
  anno_pobreza: number | null;
  fuente: string | null;
}

export interface IneiIndices {
  idh: number | null;
  idh_anno: number | null;
  ipm: number | null;                   // Índice de Pobreza Multidimensional
  ipm_anno: number | null;
  fuente: string | null;
}

export interface IneiDistrictData {
  ubigeo: string;
  nombre: string;
  provincia: string;
  departamento: string;
  data_year: number;
  fetched_at: string;
  demografia: IneiDemografia | null;
  educacion: IneiEducacion | null;
  salud: IneiSalud | null;
  vivienda: IneiVivienda | null;
  economia: IneiEconomia | null;
  indices: IneiIndices | null;
  fuentes: string[];
}

// Shape returned by the get_social_baseline_for_project RPC
export interface SocialBaselineRow extends IneiDistrictData {
  overrides: Record<string, unknown> | null;
  resolved_ubigeo: string | null;
}
