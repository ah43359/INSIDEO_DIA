/**
 * ECA Registry — single source of truth for all environmental quality parameters.
 * Mirrors the DP arrays from the standalone baseline-quality-dashboards HTML files.
 * Used by: MonitoreoMatrix, docx-generator, exceedance detection.
 *
 * Each factor has two arrays:
 * - single: parameters with one ECA threshold (standard > comparison)
 * - multi:  parameters with multiple threshold columns (agua D1/D2, ruido zones, suelos agrícola/industrial)
 */

export type CompareOp = "gt" | "lt" | "gte" | "lte" | "range" | "none";

// ─── Air ─────────────────────────────────────────────────────────────────────

export interface EcaParamSingle {
  id: string;
  name: string;
  unit: string;
  eca: number | null;
  period: string;
  on: boolean;
}

export const AIRE_PARAMS: EcaParamSingle[] = [
  { id: "PM10",   name: "Material Particulado (PM10)",         unit: "μg/m³",  eca: 100,   period: "24 horas",  on: true  },
  { id: "PM2.5",  name: "Material Particulado (PM2.5)",        unit: "μg/m³",  eca: 50,    period: "24 horas",  on: true  },
  { id: "SO2",    name: "Dióxido de Azufre (SO₂)",             unit: "μg/m³",  eca: 250,   period: "24 horas",  on: true  },
  { id: "NO2",    name: "Dióxido de Nitrógeno (NO₂)",           unit: "μg/m³",  eca: 200,   period: "1 hora",    on: true  },
  { id: "CO",     name: "Monóxido de Carbono (CO)",            unit: "μg/m³",  eca: 30000, period: "8 horas",   on: true  },
  { id: "O3",     name: "Ozono (O₃)",                            unit: "μg/m³",  eca: 100,   period: "8 horas",   on: true  },
  { id: "Pb",     name: "Plomo (Pb) en PM10",                  unit: "μg/m³",  eca: 1.5,   period: "24 horas",  on: true  },
  { id: "H2S",    name: "Sulfuro de Hidrógeno (H₂S)",           unit: "μg/m³",  eca: 150,   period: "24 horas",  on: true  },
  { id: "Benceno",name: "Benceno",                              unit: "μg/m³",  eca: 2,     period: "Anual",     on: false },
  { id: "Hg",     name: "Mercurio Gaseoso Total (HGT)",        unit: "μg/m³",  eca: 2,     period: "24 horas",  on: false },
  { id: "HAP",    name: "Hidrocarburos Aromáticos Policíclicos",unit: "μg/m³", eca: null,   period: "–",        on: false },
];

// ─── Water — single-threshold params ────────────────────────────────────────

export const AGUA_SINGLE_PARAMS: EcaParamSingle[] = [
  { id: "DBO5",   name: "DBO₅",                          unit: "mg/L",      eca: 15,    period: "–",         on: true  },
  { id: "DQO",   name: "DQO",                            unit: "mg/L",      eca: 40,   period: "–",         on: true  },
  { id: "SST",   name: "Sólidos Totales Suspendidos",     unit: "mg/L",      eca: null, period: "–",         on: false },
  { id: "CN",     name: "Cianuro Total",                  unit: "mg/L",      eca: 0.1,  period: "–",         on: false },
  { id: "ColTerm",name:"Coliformes Termotolerantes",      unit: "NMP/100mL", eca: 1000, period: "–",         on: true  },
  { id: "ColTot", name:"Coliformes Totales",              unit: "NMP/100mL", eca: 5000, period: "–",         on: false },
];

// ─── Water — multi-threshold params ────────────────────────────────────────

export type AguaCategory = "cat3r" | "cat3b" | "cat1a1" | "cat1a2" | "cat4lago" | "cat4rio";

export interface EcaParamMulti {
  id: string;
  name: string;
  unit: string;
  thresholds: Record<AguaCategory, string>;
  period: string;
  on: boolean;
}

export const AGUA_MULTI_PARAMS: EcaParamMulti[] = [
  {
    id: "pH", name: "pH", unit: "Unidad",
    thresholds: { cat3r: "6,5 – 8,5", cat3b: "6,5 – 8,4", cat1a1: "6,5 – 8,5", cat1a2: "6,5 – 8,5", cat4lago: "6,5 – 8,5", cat4rio: "6,5 – 8,5" },
    period: "–", on: true,
  },
  {
    id: "CE", name: "Conductividad Eléctrica", unit: "μS/cm",
    thresholds: { cat3r: "2500", cat3b: "5000", cat1a1: "1500", cat1a2: "2500", cat4lago: "–", cat4rio: "–" },
    period: "–", on: true,
  },
  {
    id: "OD", name: "Oxígeno Disuelto", unit: "mg/L",
    thresholds: { cat3r: "≥ 4", cat3b: "≥ 5", cat1a1: "≥ 6", cat1a2: "≥ 5", cat4lago: "≥ 4", cat4rio: "≥ 4" },
    period: "–", on: true,
  },
  { id: "As",  name: "Arsénico Total",  unit: "mg/L", thresholds: { cat3r: "0,1", cat3b: "0,2",  cat1a1: "0,01", cat1a2: "0,01", cat4lago: "0,1", cat4rio: "0,1"  }, period: "–", on: true },
  { id: "Cd",  name: "Cadmio Total",    unit: "mg/L", thresholds: { cat3r: "0,01", cat3b: "0,05", cat1a1: "0,003", cat1a2: "0,005", cat4lago: "0,01", cat4rio: "0,01" }, period: "–", on: true },
  { id: "Cr",  name: "Cromo Total",     unit: "mg/L", thresholds: { cat3r: "0,1", cat3b: "1",    cat1a1: "0,05", cat1a2: "0,05", cat4lago: "0,1", cat4rio: "0,1"  }, period: "–", on: true },
  { id: "Cu",  name: "Cobre Total",     unit: "mg/L", thresholds: { cat3r: "0,2", cat3b: "0,5",  cat1a1: "2", cat1a2: "2", cat4lago: "0,2", cat4rio: "0,2"  }, period: "–", on: true },
  { id: "Fe",  name: "Hierro Total",    unit: "mg/L", thresholds: { cat3r: "5", cat3b: "–", cat1a1: "0,3", cat1a2: "0,3", cat4lago: "1", cat4rio: "1"  }, period: "–", on: true },
  { id: "Hg",  name: "Mercurio Total",  unit: "mg/L", thresholds: { cat3r: "0,001", cat3b: "0,01", cat1a1: "0,001", cat1a2: "0,001", cat4lago: "0,001", cat4rio: "0,001" }, period: "–", on: true },
  { id: "Mn",  name: "Manganeso Total", unit: "mg/L", thresholds: { cat3r: "0,2", cat3b: "0,2", cat1a1: "0,1", cat1a2: "0,1", cat4lago: "0,2", cat4rio: "0,2"  }, period: "–", on: true },
  { id: "Pb",  name: "Plomo Total",    unit: "mg/L", thresholds: { cat3r: "0,05", cat3b: "0,05", cat1a1: "0,01", cat1a2: "0,01", cat4lago: "0,05", cat4rio: "0,05" }, period: "–", on: true },
  { id: "Zn",  name: "Zinc Total",      unit: "mg/L", thresholds: { cat3r: "2", cat3b: "24", cat1a1: "3", cat1a2: "3", cat4lago: "2", cat4rio: "2"  }, period: "–", on: true },
];

export const AGUA_CATEGORIES: { value: AguaCategory; label: string }[] = [
  { value: "cat3r",    label: "Categoría 3 – D1: Riego de vegetales y Bebida de animales" },
  { value: "cat3b",    label: "Categoría 3 – D2: Riego de vegetales (otros)" },
  { value: "cat1a1",   label: "Categoría 1 – A1: Consumo humano con desinfección" },
  { value: "cat1a2",   label: "Categoría 1 – A2: Consumo humano con tratamiento convencional" },
  { value: "cat4lago", label: "Categoría 4 – E1: Lagunas y lagos" },
  { value: "cat4rio",  label: "Categoría 4 – E2: Ríos (costa y sierra)" },
];

// ─── Noise ───────────────────────────────────────────────────────────────────

export type NoiseZone = "zpe" | "zr" | "zc" | "zi";

export interface NoiseParam {
  id: string;
  name: string;
  unit: string;
  thresholds: Record<NoiseZone, string>;
  period: string;
  on: boolean;
}

export const RUIDO_PARAMS: NoiseParam[] = [
  { id: "LAeq_diurno",   name: "LAeqT Diurno (07:01 – 22:00)", unit: "dB(A)", thresholds: { zpe: "50", zr: "60", zc: "70", zi: "80" }, period: "07:01 – 22:00", on: true },
  { id: "LAeq_nocturno", name: "LAeqT Nocturno (22:01 – 07:00)", unit: "dB(A)", thresholds: { zpe: "40", zr: "50", zc: "60", zi: "70" }, period: "22:01 – 07:00", on: true },
  { id: "Lmax_diurno",   name: "Lmax Diurno",                     unit: "dB(A)", thresholds: { zpe: "–",  zr: "–",  zc: "–",  zi: "–"  }, period: "07:01 – 22:00", on: false },
  { id: "Lmax_nocturno", name: "Lmax Nocturno",                   unit: "dB(A)", thresholds: { zpe: "–",  zr: "–",  zc: "–",  zi: "–"  }, period: "22:01 – 07:00", on: false },
  { id: "Lmin_diurno",   name: "Lmin Diurno",                     unit: "dB(A)", thresholds: { zpe: "–",  zr: "–",  zc: "–",  zi: "–"  }, period: "07:01 – 22:00", on: false },
  { id: "Lmin_nocturno", name: "Lmin Nocturno",                   unit: "dB(A)", thresholds: { zpe: "–",  zr: "–",  zc: "–",  zi: "–"  }, period: "22:01 – 07:00", on: false },
];

export const RUIDO_ZONES: { value: NoiseZone; label: string }[] = [
  { value: "zpe", label: "Zona de Protección Especial" },
  { value: "zr",  label: "Zona Residencial" },
  { value: "zc",  label: "Zona Comercial" },
  { value: "zi",  label: "Zona Industrial" },
];

// ─── Soil ────────────────────────────────────────────────────────────────────

export type SoilCategory = "agr" | "res" | "ind";

export interface SoilParam {
  id: string;
  name: string;
  unit: string;
  thresholds: Record<SoilCategory, string>;
  period: string;
  on: boolean;
}

export const SUELOS_PARAMS: SoilParam[] = [
  { id: "HC_F1",  name: "Fracción HC F1 (C6–C10)",        unit: "mg/kg", thresholds: { agr: "200",   res: "200",   ind: "500"  }, period: "–", on: true  },
  { id: "HC_F2",  name: "Fracción HC F2 (>C10–C28)",      unit: "mg/kg", thresholds: { agr: "1200",  res: "1200",  ind: "5000" }, period: "–", on: true  },
  { id: "HC_F3",  name: "Fracción HC F3 (>C28–C40)",      unit: "mg/kg", thresholds: { agr: "3000",  res: "3000",  ind: "6000" }, period: "–", on: true  },
  { id: "As",     name: "Arsénico Total",                   unit: "mg/kg", thresholds: { agr: "50",    res: "50",    ind: "140"  }, period: "–", on: true  },
  { id: "Ba",     name: "Bario Total",                      unit: "mg/kg", thresholds: { agr: "750",   res: "750",   ind: "2000" }, period: "–", on: false },
  { id: "Cd",     name: "Cadmio Total",                      unit: "mg/kg", thresholds: { agr: "1,4",   res: "1,4",   ind: "22"   }, period: "–", on: true  },
  { id: "Cr",     name: "Cromo Total",                       unit: "mg/kg", thresholds: { agr: "–",     res: "–",     ind: "1000" }, period: "–", on: false },
  { id: "Hg",     name: "Mercurio Total",                    unit: "mg/kg", thresholds: { agr: "6,6",   res: "6,6",   ind: "24"   }, period: "–", on: true  },
  { id: "Pb",     name: "Plomo Total",                       unit: "mg/kg", thresholds: { agr: "70",    res: "70",    ind: "800"  }, period: "–", on: true  },
  { id: "CN",     name: "Cianuro Libre",                    unit: "mg/kg", thresholds: { agr: "0,9",   res: "0,9",   ind: "8"    }, period: "–", on: false },
  { id: "CrVI",   name: "Cromo VI",                          unit: "mg/kg", thresholds: { agr: "0,4",   res: "0,4",   ind: "1,4"  }, period: "–", on: false },
];

export const SUELOS_CATEGORIES: { value: SoilCategory; label: string }[] = [
  { value: "agr", label: "Agrícola" },
  { value: "res", label: "Residencial / Parque" },
  { value: "ind", label: "Industrial / Extractivo" },
];

// ─── Groundwater ─────────────────────────────────────────────────────────────

export interface GroundwaterParam {
  id: string;
  name: string;
  unit: string;
  eca: string;
  compare_op: CompareOp;
  period: string;
  on: boolean;
}

export const AGUA_SUB_PARAMS: GroundwaterParam[] = [
  { id: "pH",  name: "pH",                  unit: "Unidad",   eca: "6,5 – 8,5", compare_op: "range", period: "–", on: true },
  { id: "OD",  name: "Oxígeno Disuelto",    unit: "mg/L",    eca: "≥ 4",        compare_op: "lt",    period: "–", on: true },
  { id: "CE",  name: "Conductividad Eléctrica", unit: "μS/cm", eca: "1500",    compare_op: "gt",    period: "–", on: true },
  { id: "As",  name: "Arsénico Total",       unit: "mg/L",    eca: "0,05",       compare_op: "gt",    period: "–", on: true },
  { id: "Cd",  name: "Cadmio Total",         unit: "mg/L",   eca: "0,005",      compare_op: "gt",    period: "–", on: false },
  { id: "Pb",  name: "Plomo Total",           unit: "mg/L",   eca: "0,05",       compare_op: "gt",    period: "–", on: false },
  { id: "NO3", name: "Nitratos (NO₃)",        unit: "mg/L",   eca: "50",         compare_op: "gt",    period: "–", on: false },
  { id: "Cl",  name: "Cloruros",              unit: "mg/L",   eca: "400",        compare_op: "gt",    period: "–", on: false },
  { id: "SO4", name: "Sulfatos",              unit: "mg/L",   eca: "500",        compare_op: "gt",    period: "–", on: false },
  { id: "ColTerm", name: "Coliformes Termot.", unit: "NMP/100mL", eca: "1000", compare_op: "gt",   period: "–", on: true },
];

// ─── Sediments ────────────────────────────────────────────────────────────────

export interface SedimentParam {
  id: string;
  name: string;
  unit: string;
  eca: number | null;
  period: string;
  on: boolean;
}

export const SEDIMENTOS_PARAMS: SedimentParam[] = [
  { id: "MO", name: "Materia Orgánica", unit: "%",     eca: 2,    period: "–", on: true  },
  { id: "As", name: "Arsénico Total",  unit: "mg/kg", eca: 20,   period: "–", on: false },
  { id: "Cd", name: "Cadmio Total",    unit: "mg/kg", eca: 0.5,  period: "–", on: false },
  { id: "Cr", name: "Cromo Total",     unit: "mg/kg", eca: 50,   period: "–", on: false },
  { id: "Cu", name: "Cobre Total",     unit: "mg/kg", eca: 50,   period: "–", on: false },
  { id: "Pb", name: "Plomo Total",     unit: "mg/kg", eca: 50,   period: "–", on: false },
  { id: "Zn", name: "Zinc Total",       unit: "mg/kg", eca: 150,  period: "–", on: false },
];

// ─── All factors map ─────────────────────────────────────────────────────────

export type FactorKind = "aire" | "agua_superficial" | "agua_subterranea" | "ruido" | "suelos" | "sedimentos" | "vibraciones";

export interface FactorDef {
  id: FactorKind;
  label: string;
  section: string;       // e.g. "3.3.6"
  sectionTitle: string;   // e.g. "Calidad de Aire"
  decree: string;
}

export const FACTOR_DEFS: FactorDef[] = [
  { id: "aire",               label: "Aire",               section: "3.3.6",    sectionTitle: "CALIDAD DE AIRE",                      decree: "D.S. N° 003-2017-MINAM" },
  { id: "agua_superficial",    label: "Agua Superficial",    section: "3.3.9",    sectionTitle: "CALIDAD DEL AGUA SUPERFICIAL",         decree: "D.S. N° 004-2017-MINAM" },
  { id: "agua_subterranea",    label: "Agua Subterránea",   section: "3.3.10",   sectionTitle: "CALIDAD DEL AGUA SUBTERRÁNEA",         decree: "D.S. N° 004-2017-MINAM" },
  { id: "ruido",               label: "Ruido",               section: "3.3.7",    sectionTitle: "NIVELES DE RUIDO AMBIENTAL",           decree: "D.S. N° 085-2003-PCM" },
  { id: "suelos",              label: "Suelos",              section: "3.3.5.6",  sectionTitle: "ANÁLISIS DE CALIDAD DE SUELO",         decree: "D.S. N° 011-2017-MINAM" },
  { id: "sedimentos",          label: "Sedimentos",          section: "3.3.5.7",  sectionTitle: "CALIDAD DE SEDIMENTOS",               decree: "D.S. N° 011-2017-MINAM (ref.)" },
  { id: "vibraciones",         label: "Vibraciones",         section: "3.3.8",    sectionTitle: "VIBRACIONES",                          decree: "NTP 27006 / ISO 4866" },
];

export const FACTOR_DEFS_MAP: Record<FactorKind, FactorDef> =
  Object.fromEntries(FACTOR_DEFS.map((f) => [f.id, f])) as Record<FactorKind, FactorDef>;
