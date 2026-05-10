// One-time migration of pre-RAG Cap. 6 drafts (v1) into the v2 schema.
//
// The Cap. 6 v1 manifest grouped medidas by component (aire / ruido /
// agua / suelos / flora-fauna). V2 groups them by etapa (construcción /
// operación / cierre) per the approved DIA format.
//
// Existing drafts in localStorage["dia:cap6:<projectId>"] may have v1
// keys like `pma_aireMedidas`. We map those into the v2 etapa-keyed
// content so users don't lose work.

import type { ChapterState } from "@/lib/dia/framework/state";

const V1_TO_V2_DG_FIELD_MAP: Record<string, string | null> = {
  // Direct passthroughs (same key in both schemas)
  pma_responsable: "pma_responsable",
  // Old "pma_objetivo" → new "pma_objGenerales"
  pma_objetivo: "pma_objGenerales",
  // Old residuos-specific fields → mapped where possible
  pma_residuosEORS: "pma_res_eorsRazonSocial",
  // Drop everything else from v1 dgFields — content moves into `state.content` keys below
};

/** Move v1 medida fields into v2 free-text content keyed by etapa+factor.
 *  All three etapas get the same v1 medida text initially because v1
 *  didn't separate by etapa; the user can split it manually if desired. */
const V1_MEDIDA_FIELD_TO_FACTOR_SUFFIX: Record<string, string> = {
  pma_aireMedidas: "b", // Emisiones atmosféricas
  pma_ruidoMedidas: "a", // Niveles de presión sonora
  pma_aguaMedidas: "d", // Recursos hídricos
  pma_suelosMedidas: "c", // Pérdida temporal de suelos
  pma_floraMedidas: "f", // Flora y fauna
  pma_faunaMedidas: "f", // Flora y fauna (combine with flora)
  pma_revegetacion: "c", // Suelos (revegetación es parte de cierre/suelos)
};

/** Move v1 plan-level fields into v2 free-text content for the right section.
 *  These were single-section in v1 but live as multi-section narratives in v2. */
const V1_FIELD_TO_V2_SECTION_CONTENT: Record<string, string> = {
  pma_residuosMinimizacion: "6.4.5",
  pma_residuosSegregacion: "6.4.6",
  pma_residuosTransporte: "6.4.6",
  pma_contingenciasObjetivo: "6.5.1",
  pma_contingenciasOrganizacion: "6.5.2",
  pma_contingenciasEquipamiento: "6.5.3",
  pma_contingenciasCapacitacion: "6.5.4",
  pma_relacionamientoObjetivo: "6.6.1",
  pma_relacionamientoEstrategia: "6.6.6",
  pma_relacionamientoCodigo: "6.6.2",
  pma_cierreProgresivo: "6.7.1",
  pma_cierreFinal: "6.7.1",
  pma_postCierre: "6.7.2",
  pma_cronogramaResumen: "6.8",
};

/** Detects if a Cap. 6 state object is in the v1 schema. */
export function isCap6V1(state: { dgFields?: Record<string, unknown> }): boolean {
  if (!state.dgFields) return false;
  // V1 had keys like pma_aireMedidas / pma_ruidoMedidas / pma_floraMedidas /
  // pma_residuosMinimizacion / pma_objetivo. V2 uses pma_objGenerales /
  // pma_pvaAire_estaciones etc.
  const v1Markers = [
    "pma_aireMedidas",
    "pma_ruidoMedidas",
    "pma_floraMedidas",
    "pma_residuosMinimizacion",
    "pma_objetivo",
    "pma_contingenciasObjetivo",
    "pma_relacionamientoObjetivo",
  ];
  return v1Markers.some((k) => k in state.dgFields!);
}

export function migrateCap6V1ToV2(state: ChapterState): ChapterState {
  if (!isCap6V1(state)) return state;

  const newDg: Record<string, string> = {};
  const newContent: Record<string, string> = { ...state.content };

  for (const [k, v] of Object.entries(state.dgFields)) {
    if (typeof v !== "string" || !v.trim()) continue;

    // Direct dg→dg passthroughs
    const mapped = V1_TO_V2_DG_FIELD_MAP[k];
    if (mapped) {
      newDg[mapped] = v;
      continue;
    }

    // Medidas v1 fields → v2 etapa-keyed content (write to all 3 etapas as
    // a starting point; user can refine).
    const factorSuffix = V1_MEDIDA_FIELD_TO_FACTOR_SUFFIX[k];
    if (factorSuffix) {
      for (const etapa of ["6.2.1", "6.2.2", "6.2.3"]) {
        const sid = `${etapa}.${factorSuffix}`;
        const existing = newContent[sid]?.trim();
        newContent[sid] = existing ? `${existing}\n${v}` : v;
      }
      continue;
    }

    // Single-section narrative migrations
    const targetSection = V1_FIELD_TO_V2_SECTION_CONTENT[k];
    if (targetSection) {
      const existing = newContent[targetSection]?.trim();
      newContent[targetSection] = existing ? `${existing}\n\n${v}` : v;
      continue;
    }

    // Otherwise drop silently — these v1 keys don't have a v2 home.
  }

  return {
    introFields: { ...state.introFields },
    dgFields: newDg,
    content: newContent,
  };
}
