// Capítulo 6 — Plan de Manejo Ambiental (PMA).
//
// Structure mirrors approved DIA documents (RM 108-2018-MEM/DM Anexo I §6
// + the real-world layout used in Cerrillos / Sabueso / Ccoropuro DIAs):
//
//  6.1 Objetivos
//  6.2 Medidas de Manejo Ambiental — agrupadas por ETAPA, no por componente
//      (cada etapa lista los mismos 7 factores ambientales/sociales)
//  6.3 Plan de Vigilancia Ambiental — sección autónoma con 7 monitoreos
//  6.4 Plan de Minimización y Manejo de Residuos Sólidos — 11 sub-secciones
//  6.5 Plan de Contingencias — 6 sub-secciones
//  6.6 Plan de Relaciones Comunitarias (PRC) — 11 sub-secciones
//  6.7 Plan y Actividades de Cierre — 3 sub-secciones
//  6.8 Cronograma y presupuesto del PMA
//  6.9 Cuadro resumen de compromisos ambientales
//
// V2 keeps structured field count low: la mayoría de secciones se rellenan
// vía `state.content[sectionId]` (texto libre), ya sea que el usuario lo
// escriba o que el RAG ("Generar con IA") lo sintetice desde ejemplos
// aprobados. Solo las secciones con datos tabulares específicos (ej.
// monitoreo: estaciones, parámetros, frecuencia) tienen DgFields.

import type { DgField, SectionNode as BaseSectionNode } from "@/lib/dia/framework/manifest";
import {
  collectSectionIds,
  findSection as findSectionGeneric,
} from "@/lib/dia/framework/manifest";

export type DgGroupKey =
  | "pma_alcance"
  | "pma_objetivos"
  | "pma_pva_aire"
  | "pma_pva_ruido"
  | "pma_pva_aguasup"
  | "pma_pva_efluentes"
  | "pma_pva_biologico"
  | "pma_pva_socioeconomico"
  | "pma_pva_arqueologico"
  | "pma_res_estimacion"
  | "pma_res_eors"
  | "pma_cont_riesgos"
  | "pma_prc_poblacion"
  | "pma_prc_convenios"
  | "pma_cierre_cronograma"
  | "pma_cronograma_total"
  | "pma_compromisos";

export const DG_FIELDS: Readonly<Record<DgGroupKey, readonly DgField[]>> = {
  pma_alcance: [
    { key: "pma_responsable", label: "Responsable del PMA", placeholder: "Ej: Gerencia de Medio Ambiente del titular" },
    { key: "pma_alcanceTexto", label: "Alcance (resumen)", placeholder: "Resumen del alcance del PMA: etapas cubiertas, componentes principales, áreas de aplicación.", multiline: true },
  ],
  pma_objetivos: [
    { key: "pma_objGenerales", label: "Objetivo general (1 párrafo)", placeholder: "Texto único de 2-4 líneas. Ej: Establecer las medidas de prevención, mitigación, control y compensación de los impactos identificados…", multiline: true },
    { key: "pma_objEspecificos", label: "Objetivos específicos (uno por línea)", placeholder: "Uno por línea (cada línea se vuelve un bullet)\nEj:\nCumplir con los lineamientos de gestión ambiental del Proyecto.\nRealizar las tareas de monitoreo.\nEjecutar las acciones contingentes ante riesgos.", multiline: true },
  ],
  // ── 6.3 Plan de Vigilancia Ambiental — fields tabulares mínimos ─────
  pma_pva_aire: [
    { key: "pma_pvaAire_estaciones", label: "Estaciones de monitoreo (una por línea)", placeholder: "Código — coordenadas UTM E/N — descripción\nEj:\nMA-01 — 371 200 / 8 067 933 — barlovento del campamento", multiline: true },
    { key: "pma_pvaAire_parametros", label: "Parámetros monitoreados", placeholder: "Ej: PM10, PM2.5, NO2, SO2, CO, H2S" },
    { key: "pma_pvaAire_frecuencia", label: "Frecuencia", placeholder: "Ej: Trimestral durante construcción y operación; semestral en post-cierre" },
    { key: "pma_pvaAire_normativa", label: "Normativa de referencia", placeholder: "Ej: D.S. 003-2017-MINAM (ECA Aire)" },
  ],
  pma_pva_ruido: [
    { key: "pma_pvaRuido_estaciones", label: "Estaciones de monitoreo (una por línea)", placeholder: "Código — UTM E/N — descripción", multiline: true },
    { key: "pma_pvaRuido_parametros", label: "Parámetros", placeholder: "Ej: LAeqT diurno (07:01-22:00) y nocturno (22:01-07:00)" },
    { key: "pma_pvaRuido_frecuencia", label: "Frecuencia", placeholder: "Ej: Semestral" },
    { key: "pma_pvaRuido_normativa", label: "Normativa", placeholder: "Ej: D.S. 085-2003-PCM (ECA Ruido)" },
  ],
  pma_pva_aguasup: [
    { key: "pma_pvaAguaSup_estaciones", label: "Estaciones de monitoreo (una por línea)", placeholder: "Código — UTM E/N — descripción del cuerpo de agua", multiline: true },
    { key: "pma_pvaAguaSup_parametros", label: "Parámetros", placeholder: "Ej: pH, T, OD, conductividad, SST, metales totales/disueltos" },
    { key: "pma_pvaAguaSup_frecuencia", label: "Frecuencia", placeholder: "Ej: Trimestral durante perforación; semestral resto del proyecto" },
    { key: "pma_pvaAguaSup_normativa", label: "Normativa", placeholder: "Ej: D.S. 004-2017-MINAM (ECA Agua)" },
  ],
  pma_pva_efluentes: [
    { key: "pma_pvaEfl_descripcion", label: "Descripción del programa de monitoreo de efluentes", placeholder: "Si no se generan efluentes industriales, indicarlo. Si hay efluentes domésticos vía baño portátil, describir el manejo y monitoreo del residuo.", multiline: true },
  ],
  pma_pva_biologico: [
    { key: "pma_pvaBio_estacionesFlora", label: "Estaciones de monitoreo de flora (una por línea)", placeholder: "Código — UTM E/N — formación vegetal", multiline: true },
    { key: "pma_pvaBio_estacionesFauna", label: "Estaciones de monitoreo de fauna (una por línea)", placeholder: "Código — UTM E/N — hábitat", multiline: true },
    { key: "pma_pvaBio_metodos", label: "Métodos de evaluación", placeholder: "Ej: parcelas Whittaker, transectos lineales, puntos de conteo, redes niebla" },
    { key: "pma_pvaBio_frecuencia", label: "Frecuencia", placeholder: "Ej: Una temporada (seca o húmeda) por año" },
  ],
  pma_pva_socioeconomico: [
    { key: "pma_pvaSocio_descripcion", label: "Descripción del monitoreo socioeconómico", placeholder: "Indicadores de desempeño del PRC, percepción social, atención de quejas/inquietudes.", multiline: true },
  ],
  pma_pva_arqueologico: [
    { key: "pma_pvaArqueo_descripcion", label: "Descripción del monitoreo arqueológico", placeholder: "Acompañamiento arqueológico durante remoción de suelo cerca de áreas con potencial cultural; protocolo ante hallazgo fortuito.", multiline: true },
  ],
  // ── 6.4 Residuos: campos tabulares clave ────────────────────────────
  pma_res_estimacion: [
    { key: "pma_res_noPeligrososKgDia", label: "Generación estimada de residuos NO peligrosos (kg/día o kg/mes)", placeholder: "Ej: 5 kg/día (papel, cartón, plásticos, restos orgánicos)" },
    { key: "pma_res_peligrososKgMes", label: "Generación estimada de residuos peligrosos (kg/mes)", placeholder: "Ej: 30 kg/mes (aceites, filtros, trapos contaminados)" },
  ],
  pma_res_eors: [
    { key: "pma_res_eorsRazonSocial", label: "EO-RS (razón social)", placeholder: "Empresa Operadora de Residuos Sólidos contratada" },
    { key: "pma_res_eorsRegistro", label: "Registro / autorización vigente", placeholder: "Ej: Registro EO-RS N° XXXX-XXXX-MINAM" },
    { key: "pma_res_disposicionFinal", label: "Lugar de disposición final autorizado", placeholder: "Ej: Relleno sanitario / relleno de seguridad autorizado" },
  ],
  pma_cont_riesgos: [
    { key: "pma_cont_escenarios", label: "Escenarios identificados (uno por línea)", placeholder: "Ej:\nDerrame de combustible o aceites\nIncendio en almacén\nAccidente vehicular\nSismo\nFenómenos meteorológicos extremos", multiline: true },
    { key: "pma_cont_brigadasResumen", label: "Brigadas y comando de incidentes (resumen)", placeholder: "Estructura organizacional ante emergencia, jerarquía, comunicaciones internas y externas.", multiline: true },
  ],
  pma_prc_poblacion: [
    { key: "pma_prc_aisdLista", label: "Población objetivo del AISD (uno por línea)", placeholder: "Ej:\nComunidad Campesina de Chipispaya\nCentro poblado de Putina", multiline: true },
    { key: "pma_prc_aisiLista", label: "Población del AISI", placeholder: "Ej: Distrito de Héroes Albarracín", multiline: true },
  ],
  pma_prc_convenios: [
    { key: "pma_prc_conveniosLista", label: "Convenios suscritos (uno por línea)", placeholder: "Ej:\nConvenio marco con Comunidad Campesina de Chipispaya (firmado 12-mar-2025)\nActa de servidumbre con titular del predio X", multiline: true },
    { key: "pma_prc_anexoConvenios", label: "Anexo con convenios", placeholder: "Ej: Anexo 6.6.1" },
  ],
  pma_cierre_cronograma: [
    { key: "pma_cierre_progresivoMeses", label: "Duración cierre progresivo (meses)", placeholder: "Ej: 24" },
    { key: "pma_cierre_finalMeses", label: "Duración cierre final (meses)", placeholder: "Ej: 3" },
    { key: "pma_cierre_postCierreMeses", label: "Duración post-cierre (meses)", placeholder: "Ej: 24" },
    { key: "pma_cierre_garantiaUSD", label: "Garantía financiera de cierre (US$)", placeholder: "Ej: 50 000" },
  ],
  pma_cronograma_total: [
    { key: "pma_cronograma_totalMeses", label: "Duración total del PMA (meses)", placeholder: "Ej: 34" },
    { key: "pma_cronograma_presupuestoUSD", label: "Presupuesto total del PMA (US$)", placeholder: "Ej: 120 000" },
    { key: "pma_cronograma_anexo", label: "Anexo con cronograma y presupuesto detallado", placeholder: "Ej: Anexo 6.8.1" },
  ],
  pma_compromisos: [
    { key: "pma_compromisos_resumen", label: "Cuadro resumen de compromisos ambientales (texto libre)", placeholder: "Resumen narrativo. El cuadro tabular completo va en anexo.", multiline: true },
    { key: "pma_compromisos_anexo", label: "Anexo con el cuadro de compromisos", placeholder: "Ej: Anexo 6.9.1" },
  ],
};

export type SectionNode = BaseSectionNode<DgGroupKey>;

// 7 factores ambientales/sociales que se repiten en cada etapa de medidas
const ETAPA_FACTORES = [
  { suffix: "a", title: "Niveles de presión sonora (ruido)" },
  { suffix: "b", title: "Emisiones atmosféricas (material particulado y gases)" },
  { suffix: "c", title: "Pérdida temporal de suelos" },
  { suffix: "d", title: "Recursos hídricos superficial y/o subterráneo" },
  { suffix: "e", title: "Topografía y relieve" },
  { suffix: "f", title: "Flora y fauna" },
  { suffix: "g", title: "Aspectos sociales" },
] as const;

function etapaSection(etapaId: string, etapaTitle: string): SectionNode {
  return {
    id: etapaId,
    title: etapaTitle,
    level: 2,
    children: ETAPA_FACTORES.map((f) => ({
      id: `${etapaId}.${f.suffix}`,
      title: f.title,
      level: 3,
      children: [],
    })),
  };
}

export const SECTIONS: readonly SectionNode[] = [
  {
    id: "6.0",
    title: "6.0 Plan de Manejo Ambiental",
    level: 0,
    children: [
      {
        id: "6.0.0",
        title: "Alcance e introducción",
        level: 1,
        children: [],
        structuredType: "pma_alcance",
      },
      {
        id: "6.1",
        title: "6.1 Objetivos",
        level: 1,
        children: [],
        structuredType: "pma_objetivos",
      },
      {
        id: "6.2",
        title: "6.2 Medidas de Manejo Ambiental",
        level: 1,
        children: [
          etapaSection("6.2.1", "6.2.1 Etapa de Construcción/Habilitación"),
          etapaSection("6.2.2", "6.2.2 Etapa de Operación y mantenimiento"),
          etapaSection("6.2.3", "6.2.3 Etapa de Cierre y post-cierre"),
        ],
      },
      {
        id: "6.3",
        title: "6.3 Plan de Vigilancia Ambiental",
        level: 1,
        children: [
          { id: "6.3.1", title: "6.3.1 Monitoreo de calidad de aire", level: 2, children: [], structuredType: "pma_pva_aire" },
          { id: "6.3.2", title: "6.3.2 Monitoreo del nivel de ruido", level: 2, children: [], structuredType: "pma_pva_ruido" },
          { id: "6.3.3", title: "6.3.3 Monitoreo de calidad de agua superficial", level: 2, children: [], structuredType: "pma_pva_aguasup" },
          { id: "6.3.4", title: "6.3.4 Monitoreo de efluentes", level: 2, children: [], structuredType: "pma_pva_efluentes" },
          { id: "6.3.5", title: "6.3.5 Monitoreo del medio biológico", level: 2, children: [], structuredType: "pma_pva_biologico" },
          { id: "6.3.6", title: "6.3.6 Monitoreo del medio socioeconómico", level: 2, children: [], structuredType: "pma_pva_socioeconomico" },
          { id: "6.3.7", title: "6.3.7 Monitoreo arqueológico", level: 2, children: [], structuredType: "pma_pva_arqueologico" },
        ],
      },
      {
        id: "6.4",
        title: "6.4 Plan de Minimización y Manejo de Residuos Sólidos",
        level: 1,
        children: [
          { id: "6.4.1", title: "6.4.1 Introducción", level: 2, children: [] },
          { id: "6.4.2", title: "6.4.2 Objetivo", level: 2, children: [] },
          { id: "6.4.3", title: "6.4.3 Alcance", level: 2, children: [] },
          { id: "6.4.4", title: "6.4.4 Identificación, características y estimación", level: 2, children: [], structuredType: "pma_res_estimacion" },
          { id: "6.4.5", title: "6.4.5 Minimización de residuos", level: 2, children: [] },
          { id: "6.4.6", title: "6.4.6 Gestión y manejo de residuos sólidos", level: 2, children: [], structuredType: "pma_res_eors" },
          { id: "6.4.7", title: "6.4.7 Descripción de medidas ambientales", level: 2, children: [] },
          { id: "6.4.8", title: "6.4.8 Medidas de atención ante emergencias", level: 2, children: [] },
          { id: "6.4.9", title: "6.4.9 Indicadores de seguimiento y control", level: 2, children: [] },
          { id: "6.4.10", title: "6.4.10 Presupuesto y recursos necesarios", level: 2, children: [] },
          { id: "6.4.11", title: "6.4.11 Funciones del responsable de la gestión", level: 2, children: [] },
        ],
      },
      {
        id: "6.5",
        title: "6.5 Plan de Contingencias",
        level: 1,
        children: [
          { id: "6.5.1", title: "6.5.1 Objetivos", level: 2, children: [] },
          { id: "6.5.2", title: "6.5.2 Responsabilidades y comando de incidentes", level: 2, children: [] },
          { id: "6.5.3", title: "6.5.3 Sistema de comunicación y recursos", level: 2, children: [] },
          { id: "6.5.4", title: "6.5.4 Capacitaciones y simulacros", level: 2, children: [] },
          { id: "6.5.5", title: "6.5.5 Identificación de contingencias", level: 2, children: [] },
          { id: "6.5.6", title: "6.5.6 Identificación de riesgos", level: 2, children: [], structuredType: "pma_cont_riesgos" },
        ],
      },
      {
        id: "6.6",
        title: "6.6 Plan de Relaciones Comunitarias (PRC)",
        level: 1,
        children: [
          { id: "6.6.1", title: "6.6.1 Política de responsabilidad social", level: 2, children: [] },
          { id: "6.6.2", title: "6.6.2 Código de conducta", level: 2, children: [] },
          { id: "6.6.3", title: "6.6.3 Población objetivo", level: 2, children: [], structuredType: "pma_prc_poblacion" },
          { id: "6.6.4", title: "6.6.4 Principios de relacionamiento", level: 2, children: [] },
          { id: "6.6.5", title: "6.6.5 Principios del apoyo al desarrollo local", level: 2, children: [] },
          { id: "6.6.6", title: "6.6.6 Estrategias de comunicación", level: 2, children: [] },
          { id: "6.6.7", title: "6.6.7 Política de relacionamiento", level: 2, children: [] },
          { id: "6.6.8", title: "6.6.8 Programa de comunicación y consulta", level: 2, children: [] },
          { id: "6.6.9", title: "6.6.9 Programa de contratación de mano de obra local", level: 2, children: [] },
          { id: "6.6.10", title: "6.6.10 Programa de proveedores locales", level: 2, children: [] },
          { id: "6.6.11", title: "6.6.11 Convenios suscritos", level: 2, children: [], structuredType: "pma_prc_convenios" },
        ],
      },
      {
        id: "6.7",
        title: "6.7 Plan y Actividades de Cierre",
        level: 1,
        children: [
          { id: "6.7.1", title: "6.7.1 Cierre", level: 2, children: [] },
          { id: "6.7.2", title: "6.7.2 Post-cierre", level: 2, children: [] },
          { id: "6.7.3", title: "6.7.3 Cronograma de cierre y post-cierre", level: 2, children: [], structuredType: "pma_cierre_cronograma" },
        ],
      },
      {
        id: "6.8",
        title: "6.8 Cronograma y presupuesto del PMA",
        level: 1,
        children: [],
        structuredType: "pma_cronograma_total",
      },
      {
        id: "6.9",
        title: "6.9 Cuadro resumen de compromisos ambientales",
        level: 1,
        children: [],
        structuredType: "pma_compromisos",
      },
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

/** All leaf section ids that should accept free-text content (and that the
 *  RAG synthesizer should target by default — i.e. medidas, monitoreos,
 *  residuos sub-secciones, contingencias narrative, PRC narrative, cierre
 *  narrative). Used by the "Generar con IA" button. */
export const RAG_TARGET_SECTION_IDS: readonly string[] = ALL_SECTION_IDS.filter((id) => {
  // Skip top-level groupings
  if (/^6\.[0-9]+$/.test(id)) {
    // 6.X (single-level) — only accept if the section has no children (i.e. 6.8, 6.9)
    return id === "6.8" || id === "6.9";
  }
  // Accept all 6.2.1.x, 6.3.x, 6.4.x, 6.5.x, 6.6.x, 6.7.x leaves
  return true;
});
