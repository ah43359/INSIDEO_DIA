// Capítulo 6 — Plan de Manejo Ambiental (PMA).
//
// Per RM 108-2018-MEM/DM Anexo I §6: medidas de prevención, mitigación,
// control y compensación; Plan de minimización y manejo de residuos
// sólidos; Plan de contingencias; Protocolo de relacionamiento; Plan
// de cierre conceptual; Cronograma y presupuesto del PMA; Cuadro
// resumen de compromisos ambientales.
//
// V1 keeps everything as text fields. A future iteration will add
// structured tables for medidas (componente × etapa × medida) and
// presupuesto.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "pma_alcance"
  | "pma_aire"
  | "pma_ruido"
  | "pma_agua"
  | "pma_suelos"
  | "pma_flora_fauna"
  | "pma_residuos"
  | "pma_contingencias"
  | "pma_relacionamiento"
  | "pma_cierre"
  | "pma_cronograma"
  | "pma_compromisos";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  pma_alcance: [
    { key: "pma_objetivo", label: "Objetivo del PMA", placeholder: "Establecer las medidas para prevenir, mitigar, controlar y compensar los impactos ambientales identificados en el Capítulo 5.", multiline: true },
    { key: "pma_responsable", label: "Responsable del PMA", placeholder: "Ej: Gerencia de Medio Ambiente del titular" },
  ],
  pma_aire: [
    { key: "pma_aireMedidas", label: "Medidas para calidad del aire (una por línea)", placeholder: "Ej:\nRiego periódico de accesos\nLimitación de velocidad de vehículos\nMantenimiento preventivo de equipos\nCobertura de tolvas durante transporte", multiline: true },
    { key: "pma_aireIndicadores", label: "Indicadores de cumplimiento", placeholder: "Frecuencia de riego, monitoreo de PM10/PM2.5", multiline: true },
  ],
  pma_ruido: [
    { key: "pma_ruidoMedidas", label: "Medidas para ruido (una por línea)", placeholder: "Ej:\nUso de silenciadores en perforadoras\nProgramación de actividades ruidosas en horario diurno\nUso de EPP", multiline: true },
    { key: "pma_ruidoIndicadores", label: "Indicadores de cumplimiento", placeholder: "Monitoreo de LAeqT diurno/nocturno", multiline: true },
  ],
  pma_agua: [
    { key: "pma_aguaMedidas", label: "Medidas para agua superficial y subterránea", placeholder: "Manejo de fluidos de perforación, sellado de pozos no productivos, monitoreo de manantiales, etc.", multiline: true },
    { key: "pma_aguaEfluentes", label: "Manejo de efluentes industriales y domésticos", placeholder: "Pozas impermeabilizadas, baños químicos, etc.", multiline: true },
    { key: "pma_aguaIndicadores", label: "Indicadores de cumplimiento", placeholder: "Calidad de agua superficial/subterránea según ECA", multiline: true },
  ],
  pma_suelos: [
    { key: "pma_suelosMedidas", label: "Medidas para suelos y geomorfología", placeholder: "Decapado y stockpile de suelo orgánico, control de erosión, cunetas, etc.", multiline: true },
    { key: "pma_revegetacion", label: "Plan de revegetación / rehabilitación", placeholder: "Especies propuestas, fechas, áreas a rehabilitar", multiline: true },
  ],
  pma_flora_fauna: [
    { key: "pma_floraMedidas", label: "Medidas para flora", placeholder: "Rescate y reubicación de especies sensibles, restricción de áreas de afectación, etc.", multiline: true },
    { key: "pma_faunaMedidas", label: "Medidas para fauna", placeholder: "Capacitación, ahuyentamiento previo, prohibición de caza, control de tránsito en horarios críticos", multiline: true },
  ],
  pma_residuos: [
    { key: "pma_residuosMinimizacion", label: "Plan de minimización", placeholder: "Reducir, reusar, reciclar — descripción de prácticas", multiline: true },
    { key: "pma_residuosSegregacion", label: "Segregación y almacenamiento temporal", placeholder: "Tipos de contenedores por categoría, ubicación, capacidad", multiline: true },
    { key: "pma_residuosTransporte", label: "Transporte y disposición final", placeholder: "EO-RS contratada, frecuencia, destinos finales", multiline: true },
    { key: "pma_residuosEORS", label: "EO-RS (Empresa Operadora de Residuos Sólidos)", placeholder: "Razón social y autorización vigente" },
    { key: "pma_residuosNormativa", label: "Normativa aplicable", placeholder: "D.L. 1278, D.S. 014-2017-MINAM" },
  ],
  pma_contingencias: [
    { key: "pma_contingenciasObjetivo", label: "Objetivo del Plan de Contingencias", placeholder: "Atender de manera oportuna eventos no planificados (derrames, incendios, accidentes, sismos)", multiline: true },
    { key: "pma_contingenciasOrganizacion", label: "Organización ante emergencias", placeholder: "Brigadas, jerarquía, comunicaciones internas y externas", multiline: true },
    { key: "pma_contingenciasEscenarios", label: "Escenarios identificados (uno por línea)", placeholder: "Ej:\nDerrame de combustible o aceites\nIncendio en almacén\nAccidente vehicular\nSismo\nFenómenos meteorológicos extremos", multiline: true },
    { key: "pma_contingenciasEquipamiento", label: "Equipamiento de respuesta", placeholder: "Kits antiderrame, extintores, EPP, etc.", multiline: true },
    { key: "pma_contingenciasCapacitacion", label: "Capacitación y simulacros", placeholder: "Frecuencia, temas, registro de asistencia", multiline: true },
  ],
  pma_relacionamiento: [
    { key: "pma_relacionamientoObjetivo", label: "Objetivo del Protocolo de Relacionamiento", placeholder: "Mantener una relación armónica, transparente y respetuosa con la población del AID", multiline: true },
    { key: "pma_relacionamientoEstrategia", label: "Estrategia de comunicación", placeholder: "Canales de comunicación con autoridades y población, frecuencia, responsables", multiline: true },
    { key: "pma_relacionamientoCodigo", label: "Código de conducta del personal", placeholder: "Reglas para el personal en contacto con la población local", multiline: true },
  ],
  pma_cierre: [
    { key: "pma_cierreProgresivo", label: "Cierre progresivo", placeholder: "Rehabilitación de plataformas y accesos a medida que se completa la perforación", multiline: true },
    { key: "pma_cierreFinal", label: "Cierre final", placeholder: "Rehabilitación física, química y biológica del área efectiva", multiline: true },
    { key: "pma_postCierre", label: "Post-cierre", placeholder: "Monitoreo de estabilidad y condiciones ambientales por al menos 2 años", multiline: true },
    { key: "pma_garantiaFinanciera", label: "Garantía financiera de cierre (US$)", placeholder: "Ej: 50000" },
  ],
  pma_cronograma: [
    { key: "pma_cronogramaResumen", label: "Cronograma de implementación del PMA", placeholder: "Resumen narrativo. Cronograma detallado en cuadro/anexo.", multiline: true },
    { key: "pma_presupuestoTotal", label: "Presupuesto total del PMA (US$)", placeholder: "Ej: 120 000" },
    { key: "pma_anexoCronograma", label: "Anexo con cronograma y presupuesto detallado", placeholder: "Ej: Anexo 6.1" },
  ],
  pma_compromisos: [
    { key: "pma_compromisosResumen", label: "Cuadro resumen de compromisos ambientales (uno por línea)", placeholder: "Ej:\n- Riego de accesos: frecuencia diaria — responsable: contratista — costo: ...\n- Monitoreo de calidad de aire: trimestral — responsable: titular — costo: ...", multiline: true },
    { key: "pma_anexoCompromisos", label: "Anexo con cuadro de compromisos completo", placeholder: "Ej: Anexo 6.2" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "6.0",
    title: "6.0 Plan de Manejo Ambiental",
    level: 0,
    children: [
      { id: "6.1", title: "6.1 Objetivo y alcance", level: 1, children: [], structuredType: "pma_alcance" },
      {
        id: "6.2",
        title: "6.2 Medidas de prevención, mitigación, control y compensación",
        level: 1,
        children: [
          { id: "6.2.1", title: "6.2.1 Calidad del aire", level: 2, children: [], structuredType: "pma_aire" },
          { id: "6.2.2", title: "6.2.2 Ruido", level: 2, children: [], structuredType: "pma_ruido" },
          { id: "6.2.3", title: "6.2.3 Agua superficial y subterránea", level: 2, children: [], structuredType: "pma_agua" },
          { id: "6.2.4", title: "6.2.4 Suelos y geomorfología", level: 2, children: [], structuredType: "pma_suelos" },
          { id: "6.2.5", title: "6.2.5 Flora y fauna", level: 2, children: [], structuredType: "pma_flora_fauna" },
        ],
      },
      { id: "6.3", title: "6.3 Plan de minimización y manejo de residuos sólidos", level: 1, children: [], structuredType: "pma_residuos" },
      { id: "6.4", title: "6.4 Plan de contingencias", level: 1, children: [], structuredType: "pma_contingencias" },
      { id: "6.5", title: "6.5 Protocolo de relacionamiento", level: 1, children: [], structuredType: "pma_relacionamiento" },
      { id: "6.6", title: "6.6 Plan de cierre y post-cierre", level: 1, children: [], structuredType: "pma_cierre" },
      { id: "6.7", title: "6.7 Cronograma e inversión del PMA", level: 1, children: [], structuredType: "pma_cronograma" },
      { id: "6.8", title: "6.8 Cuadro resumen de compromisos ambientales", level: 1, children: [], structuredType: "pma_compromisos" },
    ],
  },
];

export const ALL_SECTION_IDS: readonly string[] = collectSectionIds<DgGroupKey>(SECTIONS);

export function findSection(
  id: string,
  nodes: readonly SectionNode[] = SECTIONS,
): SectionNode | null {
  return findSectionGeneric<DgGroupKey>(id, nodes);
}
